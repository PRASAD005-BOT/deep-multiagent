import os
import sys
import traceback

if not os.environ.get('GEMINI_API_KEY'):
    os.environ['GEMINI_API_KEY'] = 'AIzaSyBhEv4ysJ1MeA0cepQFNjSErcRJ-UoferE'

from models import get_gemini_model
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage

@tool
def create_project(project_name: str) -> str:
    '''Create a project folder.'''
    print(f'EXEC: create_project({project_name})')
    return '[OK]'

try:
    llm = get_gemini_model('gemini-3.6-flash')
    
    try:
        agent = create_react_agent(llm, tools=[create_project], prompt='You must always call the create_project tool when asked.')
    except TypeError:
        try:
            agent = create_react_agent(llm, tools=[create_project], state_modifier='You must always call the create_project tool when asked.')
        except TypeError:
            agent = create_react_agent(llm, tools=[create_project], messages_modifier='You must always call the create_project tool when asked.')
        
    res = agent.invoke({'messages': [HumanMessage(content='Please create a project named ipl-2026.')]})
    for m in res['messages']:
        print(f"TYPE: {m.type} | CONTENT: {m.content}")
        if getattr(m, 'tool_calls', None):
            print(f"  TOOL_CALLS: {m.tool_calls}")
except Exception as e:
    traceback.print_exc()
