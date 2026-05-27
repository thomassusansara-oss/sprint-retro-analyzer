

**SprintRetro AI — Sprint Retrospective Analyzer



Draft Version 1.0
Susan Sara Thomas**




**What it is**

A browser-based sprint analysis tool that turns a Jira or Trello CSV export into a visual dashboard — with an AI-generated summary and a chatbot you can ask questions to.
Built as my first hands-on portfolio project while transitioning into Product Management.

**What it does**
Upload a CSV export from Jira or Trello and the tool generates:
A sprint health score out of 100
A status breakdown — how many tickets are done, blocked, in progress, and to do
A team workload chart — how many tickets each person has and their completion rate
A capacity utilisation view — progress bars per person with an overload flag
A blocked tickets table — every blocked ticket with its owner and priority
A ticket label breakdown — feature vs bug vs tech-debt split
An AI sprint summary — generated on click, based only on the data you uploaded
A chatbot — ask questions about your sprint in plain English

**Why I built this**
Sprint retrospectives involve a lot of manual work — exporting data, counting tickets, checking who is blocked, writing up a summary. I wanted to see if I could build something that does that automatically from a CSV file.
This is my first project built while learning React and exploring AI APIs. It is not a finished product — it is a learning project that I built to develop PM and technical skills at the same time.

**Try it instantly**
- The easiest way to try it is inside Claude.ai — the AI features work there without any setup.
- To run it locally:
    git clone https://github.com/YOUR_USERNAME/sprint-retro-analyzer.git
    cd sprint-retro-analyzer
    npm install
    npm install recharts papaparse
    npm run dev
    Then open http://localhost:5173 in your browser.
_Note: The AI summary and chatbot require the Anthropic Claude API. These work automatically inside Claude.ai. For local use you would need to set up a backend with your own API key._
- A sample CSV is included in the /data folder so you can test it without needing a real export.

**Supported CSV formats**
Jira — works with standard Jira exports that include: Issue Key, Summary, Assignee, Status, Priority, Story Points, Sprint, Labels
Trello — works with Trello CSV exports that include: Card Name, List Name, Members, Labels, Due Date

**Tech used****
**Technology  **                          What it does**
React                                UI and state management
Recharts                             Charts and visualisations
PapaParse                            Reads and parses the CSV file
Claude API                           AI summary and chatbot responses
CSS-in-JS                            Styling — no external CSS framework used
Google Fonts                         Typography


**What works and what doesn't**
_Works locally:_
- CSV upload and parsing
- All charts and visualisations
- Health score calculation
- Blocked tickets table
_Only works in Claude.ai_:
- AI sprint summary
- Chatbot Q&A

**Roadmap**
_Things I want to add next:_
- Compare two sprints side by side
- Export the dashboard as a PDF
- Shareable link so others can view the report
- Daily standup generator

**Author**
Built by Susan Sara Thomas LinkedIn · GitHub
Built with AI assistance using Claude by Anthropic. The problem framing, product decisions, and learning are my own.

