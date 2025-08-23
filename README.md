# Job Management Dashboard

A full-stack web application for managing jobs with real-time status updates, search functionality, and pagination.

## 🧠 Thought Process Throughout The Project

### Summary
 Time spent: 6-8 Hours
 Overall process: Set up project with React front end and Django backend -> Refamiliarize myself with Django and implement models, views, and serializers for backend -> Produce very generic
 
 Throughout the development of this application I followed the general motto I follow, "Make it work, then make it pretty". I decided to start off by developing the backend first, seeing as the requirements were well defined with what was expected and I could build the serializer and the model fairly easy. It had been a while so I thought to do some refreshers on views and utilized Copilot to help me build out the views.
 
 I then utilized AI to build a very simple front end that would allow me to create a job and view a job card. Shortly after I also prompted the AI to have a delete button and make the changes to the back-end accordingly.
 So great, I could create and delete a job. Now was to get to what I deemed a little bit of the more challenging part, the front end.

 With keeping the idea of scalability in mind, every action I made with the front end was with a large data set in mind. First I thought how to properly display a large data set, infinite scrolling with lazy loading was the first idea but then I prompted for a cursor-based pagination, that way we would only display a few select jobs at a time and realized we could use a cache (Redis) to help manage the pages so that way we do not have to fetch results from the API EVERY TIME we went onto a new page or created a job, changed a status etc.
 
 There were challenges within the pagination but I was able to make it work, and then came the "make it pretty" part. I decided to use Materials UI rather then something like Chakra UI as Material UI has a lot of "ready-to-go" components, and since a job application dashboard is better to have ease of use and is very systemized, I decided to go with Material UI. I prompted AI for a lot of this and organized an already existing front-end to utilize Material UI and therefore we came to the front-end that exists for the project.
 
 Throughout the whole development process, I utilized AI to create the playwright tests as we went and utilized the failure outputs to prompt the AI so we could adjust the code and the tests accordingly. I utilized Playwright to help me with the edge cases that I was facing with pagination of the front-end and in doing so it actually speeded up my development process to fix those edge-case bugs.
 
 Error handling, Modularity, Readbility and Type Safety were all practiced throughout the development of this application. Try catch blocks for async operations, snackbox notifications upon server errors (allows for more user visiblity to read errors) and more were implemented throughout development. I seperated concerns by organizing code to reusable components, hooks, and utility functions. I utilized proper React components and hooks along with compile-time error prevention and kept contexts for state management. All of this ensures clear user feedback and graceful error handling

 I tested this application with a Fresh Ubuntu Linux Virtual Machine Instance. I wanted to ensure that "make test" would run on a system with only make, docker, docker-compose, and bash installed on it. After installing only the bare software as prefaced by the Evaluation Criteria, I faced challenges to get it working between my Linux VM and my Local Mac Environment. I prompted AI to help me find a solution (more detailed below in Challenges), and decided on using our frontend host to decide which backend to connect to. Overall, the project ended up working with the Evaluation Criteria requirements.

### Challenges
 There were two big challenges within this project
 1. Edge cases and bugs with the pagination

    In order to optimize front end performance while maintaining a clean UI, I decided to go with cursor-based pagination rather then lazy loading or infinite scrolling.

    The biggest edge case with pagination was concerning the deletion of jobs, as I wanted jobs from the next page to backfill the jobs on the current page. Interactions with AI, although helpful, would sometimes lead down a rabbit hole of repeated changes that wouldn't have previously met my expectations.

    One thing that helped me overcome this challenge was my interaction with the code and VERY specific prompts. Rather then just "It is not populating the page upon deletion", solutions arose upon prompting of "The page is not being properly populated upon deletion of jobs. I expected the behavior to be that if I delete a job on the current page, then a job from the next page would be populated at the bottom of the current page; If the next page only has one job, I expect that the next page will not exist anymore and if we are on the first page and the second page has no more jobs from deletion, then I expect the next and previous buttons to not appear on the UI anymore"

    I understand that software can be finicky, however if something else does arise from the use of pagniation during the use of the software, I implemented the refresh button that fixes any issues immediately and cleans up the UI.

    VERY Specific prompts were the answer to most of these edge cases.
 
 2. Fixing the make file for it to work with both my local environment and a linux vm (for testing with a system only make, docker, docker-compose, and bash installed)

    A few hours were spent trying to get "make test" to work on a machine without npm installed. Then after the use of AI, I did get it to work on my linux virtual machine but then my local environment would not work.
 
    At first I was merely prompting the AI "Oh, now it doesn't work here, now it doesn't work here" and after getting nowhere with that I quickly decided to check some "hunches" I had. Turns out my first hunch was right.
 
    It was a smart move to have a playwright container, but I realized when I saw that the front end of my local environment was prompting me "network error" that I was connecting to the wrong backend with local development due to the changes in the make file and how client.ts was calling "resolveApiUrl".
 
    I then told the AI prompt about this issue and quickly prompted it to fix resolveApiUrl, which then produced the code that allowed make to properly work in whichever environment it was running from.


### AI Usage and Prompt Refinements (Github Copilot)
 Logs were created for each day that was spent working on this. Has generalized summary of what was achieved that day along with prompts and interactions with Copilot.

 - Besides the interactions I mentioned in Challenges, another issue with AI was that it was keeping my code too messy. The app file at one point was almost 500 lines of code, nearly having the entire front end in one file. I noticed that regardless of the prompts I would use, it wouldn't clean up the code how I envisioned it.
    I therefore came to a conclusion to try out a different model, for most of the development process I was using GpT-5o (preview) with Github Copilot, and decided to switch to Claude Sonnet 4 (Github Copilot default). I then prompted the AI to modularize and clean up the App.tsx file which resulted in more modularity via creation of more components, hooks, contexts and pages and resulted in the App.tsx file shortening by nearly 400 lines.

## 🚀 Features

### Core Functionality
- **Job Management**: Create, view, update, and delete jobs
- **Status Tracking**: Real-time job status updates (Pending, In Progress, Completed, Failed)
- **Search**: Prefix-based job search with instant filtering
- **Pagination**: Efficient cursor-based pagination for large datasets

### Advanced Features
- **Responsive Design**: Mobile-friendly interface with adaptive layouts
- **Dark/Light Theme**: Toggle between themes for better user experience
- **Error Handling**: Robust error boundaries and user-friendly error messages
- **Loading States**: Smooth loading indicators and optimistic updates
- **Real-time Updates**: Instant UI feedback with server synchronization

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Material-UI (MUI)** for consistent, accessible design components
- **React Query** for efficient data fetching and caching
- **React Router** for client-side navigation

### Backend
- **Django** with Django REST Framework
- **SQLite** database for data persistence
- **Cursor-based pagination** for optimal performance

### DevOps & Testing
- **Docker** for containerized development and deployment
- **Playwright** for comprehensive end-to-end testing
- **Make** for simplified build and deployment commands

## 📋 Requirements

- Docker and Docker Compose
- Node.js 18+ (for local development)
- Python 3.9+ (for local development)

## 🚀 Quick Start

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ReScale2
   ```

2. **Start the application**
   ```bash
   make build && make up
   ```

3. **Seed the database with sample data**
   ```bash
   make seed
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api

### Running Tests

Simply clone the gitlab 
```bash
# Run all tests
make test
```

## 📖 API Documentation

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs/` | List all jobs |
| POST | `/api/jobs/` | Create a new job |
| GET | `/api/jobs/{id}/` | Get job details |
| PATCH | `/api/jobs/{id}/` | Updates a job |
| DELETE | `/api/jobs/{id}/` | Deletes a job |

### Query Parameters

- `q`: Search jobs by name prefix
- `page_size`: Number of jobs per page (default: 15)
- `after`: Cursor for next page
- `before`: Cursor for previous page

## 🏗 Architecture

### Frontend Architecture
```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts for state management
├── hooks/              # Custom hooks for business logic
├── pages/              # Page components
├── utils/              # Utility functions
└── types.ts            # TypeScript type definitions
```

### Key Design Patterns
- **Context + Hooks**: Centralized state management with React Context
- **Error Boundaries**: Graceful error handling preventing app crashes
- **Optimistic Updates**: Immediate UI feedback with server reconciliation
- **Responsive Design**: Mobile-first approach with Material-UI breakpoints


### End-to-End Tests
- Job creation and status updates
- Search functionality validation
- Pagination behavior testing
- Edge case handling (empty states, error conditions)

### Test Coverage
- ✅ Job CRUD operations
- ✅ Status update workflows
- ✅ Search and filtering
- ✅ Pagination navigation
- ✅ Error handling scenarios

### Production Build
```bash
# Build and start production services
make prod

# Run health checks
make health-check
```

### Environment Variables
- `E2E_BASE_URL`: Frontend URL for testing
- `E2E_API_URL`: Backend API URL for testing

## 📝 Development Notes

### Key Implementation Details
- **Cursor Pagination**: Implements efficient pagination for large datasets
- **Cache Management**: React Query handles data synchronization and caching
- **Error Recovery**: Graceful degradation with user-friendly error messages
- **Performance**: Optimized rendering with proper state management

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request

---

**Note**: This application was built as a take-home assignment demonstrating full-stack development capabilities with modern web technologies.