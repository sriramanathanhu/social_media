# Goal
Multi-platform social media management system with scheduling capabilities for X, Mastodon, and Pinterest.

# Standard instructions for AI 
This section maintains essential context of the project state across different chats and compactions. We maintain:
- Current active instructions
- History of implemented instructions  
- Key contextual information (bugs fixed/found, features implemented, common pitfalls, task progress)
- Current project state and direction

## Context Files
- [Current Active Instructions](current-active-instructions.md)
- [Implemented Instructions](implemented-instructions.md)
- [Common Pitfalls](common-pitfalls-to-watch-out.md)
- [Vision](vision.md)

# Project Structure
- **Frontend**: React/TypeScript with Material-UI, Redux Toolkit
- **Backend**: Node.js/Express with PostgreSQL
- **Platforms**: X (Twitter), Mastodon, Pinterest
- **Authentication**: OAuth 2.0 flows for each platform

# Testing Commands
- Frontend: `cd client && npm test`
- Backend: `cd server && npm test`
- Linting: `cd client && npm run lint` and `cd server && npm run lint`

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.