from sqlalchemy import create_engine
from langchain_community.chat_models import ChatOpenAI
from langchain_community.utilities import SQLDatabase
from langchain_experimental.sql import SQLDatabaseChain
from langchain.prompts import PromptTemplate
import re
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

class SupabaseConnector:
    def __init__(self, user, password, host, db_name, port="5432"):
        self.db_uri = f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{db_name}"
        self.db = None

    def connect(self):
        self.db = SQLDatabase.from_uri(self.db_uri)
        return self.db

    def test_connection(self):
        if self.db is None:
            raise Exception("Database is not connected.")
        print("✅ Supabase connection successful!")
        print(self.db.get_usable_table_names())

class LLMChatBot:
    def __init__(self, db, model="gpt-4o-mini", temperature=0.0, verbose=True, openai_api_key=None):
        self.db = db
        self.model_name = model
        self.temperature = temperature
        self.verbose = verbose
        self.openai_api_key = openai_api_key
        
        # Initialize components
        self.llm = ChatOpenAI(temperature=temperature, model_name=model, openai_api_key=openai_api_key)
        
        # Create a direct SQLDatabaseChain
        self.db_chain = SQLDatabaseChain.from_llm(
            llm=self.llm,
            db=self.db,
            verbose=verbose,
            return_intermediate_steps=True
        )
        
        # Create a formatting chain for natural language responses
        self.format_prompt = ChatPromptTemplate.from_template("""
            You are a helpful assistant that presents database query results in natural language.
            
            Original question: {question}
            Raw database result: {result}
            
            Convert this raw result into a clear, concise, and human-friendly answer.
            Format any numbers appropriately (with commas for thousands, round to 2 decimal places when needed).
            Include units if they are implied by the question (prices should be in dollars).
            
            For lists or multiple items:
            - Put each item on a new line using line breaks
            - Number items clearly if they represent a ranked list
            - Use line breaks between paragraphs for better readability
            
            Example 1:
            Question: what is the highest price in alexandria in year 2022?
            Raw result: [(Decimal('668226.6417423502'),)]
            Response: The highest price in Alexandria in 2022 was $668,226.64.
            
            Example 2:
            Question: what are the top 5 highest prices in alexandria in year 2022?
            Raw result: [(Decimal('668226.64'), 'Jul 31, 2022'), (Decimal('665818.40'), 'Jun 30, 2022'), ...]
            Response: The top five highest prices in Alexandria in 2022 were as follows:
            
            1. $668,226.64 on July 31, 2022
            2. $665,818.40 on June 30, 2022
            3. $664,866.84 on May 31, 2022
            4. $663,810.11 on July 31, 2022
            5. $662,475.81 on May 31, 2022
            
            Your response:
        """)
        
        # Create the formatting chain
        self.formatter = self.format_prompt | self.llm | StrOutputParser()
        
    def reset(self):
        """Reset all components to ensure no memory persistence between queries."""
        # Recreate the LLM instance
        self.llm = ChatOpenAI(temperature=self.temperature, model_name=self.model_name, openai_api_key=self.openai_api_key)
        
        # Recreate the SQLDatabaseChain
        self.db_chain = SQLDatabaseChain.from_llm(
            llm=self.llm,
            db=self.db,
            verbose=self.verbose,
            return_intermediate_steps=True
        )
        
        # Recreate the formatter chain
        self.formatter = self.format_prompt | self.llm | StrOutputParser()
        
        return self
        
    def clean_sql(self, sql):
        """Remove markdown code blocks and other formatting from SQL."""
        # Remove markdown code block syntax
        sql = re.sub(r'```(?:sql)?\s*|\s*```', '', sql, flags=re.MULTILINE)
        cleaned_sql = sql.strip()
        
        # Add "value IS NOT NULL" condition if needed
        if "WHERE" in cleaned_sql.upper() and "value IS NOT NULL" not in cleaned_sql.upper():
            # Use a robust regex to handle the WHERE clause
            cleaned_sql = re.sub(
                r'(WHERE\s+.*?)(?=\s+ORDER BY|\s+GROUP BY|\s+LIMIT|$)', 
                r'\1 AND "value" IS NOT NULL', 
                cleaned_sql, 
                flags=re.IGNORECASE
            )
        elif "WHERE" not in cleaned_sql.upper():
            # No WHERE clause, add one before any ORDER BY, GROUP BY, or LIMIT
            position = float('inf')
            for clause in ["ORDER BY", "GROUP BY", "LIMIT"]:
                pos = cleaned_sql.upper().find(clause)
                if pos != -1 and pos < position:
                    position = pos
            
            if position < float('inf'):
                cleaned_sql = cleaned_sql[:position] + ' WHERE "value" IS NOT NULL ' + cleaned_sql[position:]
            else:
                cleaned_sql += ' WHERE "value" IS NOT NULL'
        
        return cleaned_sql
        
    def ask(self, question):
        # Reset before processing the question
        self.reset()
        
        try:
            # Using SQLDatabaseChain to get raw results
            raw_result = self.db_chain(question)
            sql_steps = raw_result["intermediate_steps"]
            db_result = raw_result["result"]
            
            # Format the raw result into natural language
            formatted_answer = self.formatter.invoke({
                "question": question,
                "result": db_result
            })
            
            # Return the formatted answer and the steps for debugging
            return formatted_answer, sql_steps
            
        except Exception as e:
            # If we get an error, it might be due to markdown formatting
            error_str = str(e)
            if "[SQL:" in error_str:
                # Extract the SQL from the error message
                sql_match = re.search(r'\[SQL:(.*?)\]', error_str, re.DOTALL)
                if sql_match:
                    sql = sql_match.group(1).strip()
                    # Clean the SQL query
                    cleaned_sql = self.clean_sql(sql)
                    try:
                        print(f"Attempting to run cleaned SQL: {cleaned_sql}")
                        # Execute the cleaned SQL directly
                        db_result = self.db.run(cleaned_sql)
                        print(f"SQL result: {db_result}")
                        # Format the error-recovery result into natural language
                        formatted_answer = self.formatter.invoke({
                            "question": question,
                            "result": db_result
                        })
                        
                        return formatted_answer, f"Original query had markdown formatting. Cleaned SQL: {cleaned_sql}"
                    except Exception as inner_e:
                        # Second-level failure - use LLM to explain
                        pass
            
            # If we couldn't fix it, use LLM to generate a friendly error message
            error_prompt = ChatPromptTemplate.from_template("""
                You are a helpful assistant explaining database query issues.
                Our database is related to real estate prices in DMV area
                
                The user asked: {question}
                
                The database query failed.
                
                Generate a friendly, helpful response that acknowledges we couldn't find the requested data.
                
                Keep your response short, concise without explaination.
            """)

            error_chain = error_prompt | self.llm | StrOutputParser()
            friendly_message = error_chain.invoke({
                "question": question,
                "error": str(e)
            })
            
            return friendly_message, f"Error occurred: {str(e)}"

