# main_simple.py (or main.py) - Comments and prints in English
import os
import logging # Keep basic logging import for potential errors
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from typing import Optional
from fastapi.staticfiles import StaticFiles
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

# --- Attempt to import user's classes ---
try:
    # Ensure langchain_supabase_rag.py is in the same directory
    # and contains the SupabaseConnector and LLMChatBot classes
    from langchain_supabase_rag import SupabaseConnector, LLMChatBot, SQLDatabase
    IMPORTS_OK = True
except ImportError as e:
    # Log error if imports fail
    logging.error(f"Could not import from langchain_supabase_rag.py: {e}. Make sure the file exists and contains the necessary classes.")
    IMPORTS_OK = False
    SupabaseConnector, LLMChatBot, SQLDatabase = None, None, None

# --- Environment Variable Loading ---
load_dotenv() # Load variables from .env file

# --- Pydantic Models (Keep these for validation) ---
class QuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, description="The question to ask the chatbot")

class ChatResponse(BaseModel):
    answer: str

# --- Initialize Chatbot Directly (Simpler Approach) ---
# Use Optional for type hinting
chatbot_instance: Optional['LLMChatBot'] = None
initialization_error: Optional[str] = None

if not IMPORTS_OK:
    initialization_error = "Core classes could not be imported. Check langchain_supabase_rag.py."
    print(f"ERROR: {initialization_error}") # Simple print for critical error
else:
    # --- Load Configuration ---
    # Keys read here must match the .env file
    USER = os.getenv("DB_USER")
    PASSWORD = os.getenv("PASSWORD")
    HOST = os.getenv("DB_HOST") 
    DB_NAME = os.getenv("DB_NAME")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

    # --- Basic Configuration Validation ---
    # Correct the check here to match the keys used in os.getenv() above and in the .env file
    missing_vars = [var for var in ("DB_USER", "PASSWORD", "DB_HOST", "DB_NAME", "OPENAI_API_KEY") if not os.getenv(var)]
    if missing_vars:
        initialization_error = f"Missing necessary environment variables: {', '.join(missing_vars)}"
        print(f"ERROR: {initialization_error}") # Simple print
    else:
        # --- Initialization (if configuration validation passes) ---
        try:
            print("Initializing Supabase connection...")
            # Pass the loaded USER, PASSWORD, etc., variables to the Connector
            connector = SupabaseConnector(USER, PASSWORD, HOST, DB_NAME)
            db = connector.connect()
            # Simple connection test
            db.run("SELECT 1;")
            print("✅ Supabase connection successful!")

            print("Initializing LLMChatBot...")
            # API usually doesn't need verbose logging
            chatbot_instance = LLMChatBot(db, openai_api_key=OPENAI_API_KEY, verbose=False)
            print("✅ LLMChatBot initialized successfully.")

        except Exception as e:
            initialization_error = f"Failed during initialization: {e}"
            print(f"ERROR: {initialization_error}") # Simple print
            # chatbot_instance will remain None

# --- Create FastAPI App Instance (No lifespan needed for this simple version) ---
app = FastAPI(
    title="Simple Chatbot API",
    description="A simplified API for the Langchain Supabase Chatbot.",
    version="1.0.0",
)

# Only serve built static files in production
ENV = os.getenv("ENV", "development").lower()
if ENV == "production":
    app.mount("/", StaticFiles(directory="static", html=True), name="static")

# After creating the FastAPI app, add:
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React development server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoint (Simplified Error Handling) ---
@app.post(
    "/api/chat",
    response_model=ChatResponse,
    summary="Ask the chatbot a question (Simple)",
    tags=["Chatbot"]
)
async def chat_endpoint(request_body: QuestionRequest):
    """Receives a question and returns the chatbot's answer."""
    print(f"Received question: {request_body.question}") # Simple print log

    # Check if initialization failed
    if initialization_error:
        # Using 503 Service Unavailable is still appropriate
        raise HTTPException(status_code=503, detail=f"Service Unavailable: {initialization_error}")

    if not chatbot_instance:
         # Should normally be caught by the check above, but as a fallback
         raise HTTPException(status_code=500, detail="Internal Server Error: Chatbot not ready.")

    try:
        # Call the chatbot's ask method
        answer, steps = chatbot_instance.ask(request_body.question)
        print(f"Generated answer: {answer}") # Simple print log
        return ChatResponse(answer=answer)

    except Exception as e:
        # Log the detailed error on the server (using print for simplicity)
        print(f"ERROR processing question '{request_body.question}': {e}")
        # Return a generic 500 error to the client
        raise HTTPException(status_code=500, detail="We encountered an SQL error processing your request. PLease try another way to ask the question.")

# --- How to Run ---
# 1. Save this code as main_simple.py (or overwrite main.py)
# 2. Ensure langchain_supabase_rag.py is in the same directory.
# 3. Ensure .env file with credentials is in the same directory.
# 4. Ensure requirements.txt is present and dependencies installed in venv.
# 5. Run: uvicorn main_simple:app --reload --port 8000
#    (Replace main_simple with main if you overwrote main.py)