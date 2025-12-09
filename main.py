from fastapi import FastAPI
from pydantic import BaseModel
import arxiv
from starlette.middleware.cors import CORSMiddleware
from openai import OpenAI
import os
import uvicorn
import json
import logging
from typing import List, Dict, Any

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI()

# 初始化 OpenAI
client = OpenAI(
    api_key="sk-r96NJkJ9PxPpyOjF8vh2xdefGwsNk9Te6CTuzw2ImiOZPNbs", # 请替换为您的 gptgod API Key
    base_url="https://api.gptgod.online/v1/"
)
# genai.configure(api_key="AIzaSyC0SJz7Q1kov_gU5cxYRUefiLSphTksIqc")
# model = genai.GenerativeModel('gemini-2.5-flash')

class SearchRequest(BaseModel):
    idea: str

def clean_json_text(text: str) -> str:
    """Helper to clean markdown code blocks from JSON string"""
    if "```json" in text:
        return text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        return text.split("```")[1].strip()
    return text.strip()

def get_streaming_response(prompt: str, model: str = "gemini-3-pro-preview-thinking") -> str:
    """Helper to get streaming response from LLM"""
    stream = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        stream=True
    )
    
    full_response = ""
    for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end='', flush=True)
            full_response += chunk.choices[0].delta.content
            
    return full_response

@app.post("/api/research")
async def research_topic(request: SearchRequest):
    logger.info(f"Received research request for idea: {request.idea}")
    try:
        # --- Step 1: 意图分析 (Intent Analysis) ---
        logger.info("Step 1: Analyzing research intent...")
        intent_prompt = f"""
You are a Senior Computer Vision Researcher with a "Problem-First" mindset.
        The user has a research idea/query. Your task is to translate this into a robust Arxiv search strategy.

        User Input: "{request.idea}"

        Task:
        1. Analyze the technical intent. Identify the **Fundamental Research Problem** (e.g., "Sparse View Reconstruction" instead of "NeRF"), the **Core Challenge** (e.g., "Occlusion handling", "High frequency details"), and the **Broad Technical Route** (e.g., "Implicit representations", "Diffusion models").
        2. Generate 3 DISTINCT Arxiv search queries to maximize recall.
        
        CRITICAL CONSTRAINT: 
        - Do NOT include specific architecture names (e.g., "ResNet", "YOLO", "Transformer", "LoRA") or specific famous model names unless the user explicitly mentioned them. These limit the search scope to outdated methods.
        - Instead, use the *academic description* of the method (e.g., use "masked image modeling" instead of "MAE", use "state space models" instead of "Mamba").

        Output JSON format ONLY:
        {{
            "analysis": "Brief analysis of the core problem and the type of solution strategy (abstracted from specific model names).",
            "keywords": ["Problem Definition", "Key Challenge", "Technical Paradigm"],
            "queries": [
                "Query 1 (Focus on Task + Input/Output definition)", 
                "Query 2 (Focus on the Core Challenge/Constraint)", 
                "Query 3 (Focus on the Intersection of Task and Broad Methodology)"
            ]
        }}
        """
        
        intent_content = get_streaming_response(intent_prompt)
        
        intent_data = json.loads(clean_json_text(intent_content))
        logger.info(f"Intent Analysis: {intent_data['analysis']}")
        logger.info(f"Generated Queries: {intent_data['queries']}")

        # --- Step 2: 多路召回 (Multi-Query Retrieval) ---
        logger.info("Step 2: Executing multi-query search on Arxiv...")
        all_papers = {} # Use dict for deduplication by entry_id
        
        for query in intent_data['queries']:
            # Clean query
            clean_query = query.replace('"', '').replace("'", "")
            logger.info(f"Searching: {clean_query}")
            
            try:
                search = arxiv.Search(
                    query=clean_query,
                    max_results=100, # Fetch top 5 for each query
                    sort_by=arxiv.SortCriterion.Relevance
                )
                
                for result in search.results():
                    if result.entry_id not in all_papers:
                        all_papers[result.entry_id] = {
                            "title": result.title,
                            "summary": result.summary,
                            "url": result.pdf_url,
                            "authors": [a.name for a in result.authors],
                            "published": str(result.published),
                            "entry_id": result.entry_id,
                            "raw_object": result # Keep for later if needed
                        }
            except Exception as e:
                logger.error(f"Search failed for query '{clean_query}': {e}")

        papers_list = list(all_papers.values())
        logger.info(f"Total unique papers found: {len(papers_list)}")
        
        if not papers_list:
             return {"papers": [], "analysis": "No papers found. Try a broader query."}

        # --- Step 3: 智能重排序 (Reasoning Rerank) ---
        logger.info("Step 3: Reranking papers with LLM...")
        
        # Prepare simplified paper list for LLM to save tokens
        papers_for_ranking = [
            {"id": p["entry_id"], "title": p["title"], "published": p["published"], "abstract": p["summary"][:500]} 
            for p in papers_list
        ]
        
        rerank_prompt = f"""
        User Research Intent: "{request.idea}"
        Technical Analysis: "{intent_data['analysis']}"
        
        Task:
        Score the following papers (0-10) based on how well they match the user's specific technical constraints AND how recent they are.
        
        Scoring Criteria:
        - Relevance (Primary): Does it solve the core problem?
        - Recency (Secondary): Boost score for papers published in 2024-2025. Penalize slightly for papers older than 2023 unless seminal.
        
        - High Score (8-10): Highly relevant AND recent (or a classic seminal paper).
        - Medium Score (5-7): Relevant but older, or slightly less relevant but very recent.
        - Low Score (0-4): Irrelevant.
        
        Papers to Rank:
        {json.dumps(papers_for_ranking)}
        
        Output JSON format ONLY:
        [
            {{"id": "paper_entry_id", "title": "paper_title", "score": 9.5, "reason": "Brief reason..."}},
            ...
        ]
        """
        
        rerank_content = get_streaming_response(rerank_prompt)
        
        try:
            ranking_data = json.loads(clean_json_text(rerank_content))
            # Create a map for easy lookup
            ranking_map = {item['id']: item for item in ranking_data}
            
            # Attach scores and reasons to papers
            for paper in papers_list:
                rank_info = ranking_map.get(paper['entry_id'])
                if rank_info:
                    paper['score'] = rank_info.get('score', 0)
                    paper['reason'] = rank_info.get('reason', '')
                else:
                    paper['score'] = 0
                    paper['reason'] = 'Not ranked'
            
            # Sort by score descending
            papers_list.sort(key=lambda x: x['score'], reverse=True)
            
            # Keep top 20 relevant papers
            final_papers = papers_list[:20]
            
        except Exception as e:
            logger.error(f"Reranking failed: {e}. Returning original order.")
            final_papers = papers_list[:20]

        # --- Step 4: Final Analysis (Optional, reusing Intent Analysis) ---
        # We can combine the intent analysis with a quick summary of the top paper
        summary_text = f"**Research Strategy Analysis:**\n{intent_data['analysis']}"
        if final_papers:
            top_paper = final_papers[0]
            summary_text += f"\n\n**Top Recommendation:**\nThe paper *{top_paper['title']}* is highly recommended because: {top_paper.get('reason', 'It matches your query well.')}"

        return {
            "papers": final_papers,
            "analysis": {
                "summary": summary_text,
                "keyTrends": intent_data.get("keywords", ["AI Research", "Computer Vision"]),
                "suggestedDirections": intent_data.get("queries", [])
            }
        }

    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        raise e

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 允许所有来源，方便调试
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)