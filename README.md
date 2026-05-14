# EduSync - SEC Productivity App

EduSync is a comprehensive academic productivity platform designed to streamline operations for students and administrators. It features AI-powered tools that automate traditionally manual tasks such as timetable generation and lab record creation, all wrapped in a modern, responsive interface ("Clean Sync" design system).

## 🌟 Key Features

* **AI Schedule Crafter (Timetable Maker):** 
  An intelligent wizard that parses unstructured timetable data and generates a structured, printable weekly exam/class schedule. It supports constraints like staff assignments and slot pinning.
* **Record Book Forge (AI Record Book PDF Maker):** 
  A tool for students to automatically generate professional PDF lab records. It integrates with GitHub to verify live repository URLs and maps them to administrative subject guidelines.
* **Student Academic Portal:** 
  Includes attendance tracking, a GPA calculator, and a Q&A board.
* **Administrative Dashboard:**
  Provides secure controls for moderating subject-repository mappings, managing schedules, and performing targeted database resets.

## 🛠 Tech Stack

* **Frontend:** Vanilla JavaScript, HTML5, CSS3, Vite
* **Backend / Database:** Hybrid architecture using Supabase and Firebase
* **AI Integration:** NVIDIA AI endpoints utilizing advanced LLMs (e.g., Llama 3.3 70B) for parsing unstructured data and generating structured outputs.
* **Styling:** Custom "Clean Sync" CSS framework (Mobile-first, responsive design)

## 🚀 Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/chandru8428/sec-prodectivity-app.git
   cd sec-prodectivity-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Copy the example environment file and configure your API keys:
   ```bash
   cp .env.example .env
   ```
   *Edit the `.env` file to include your Supabase and NVIDIA AI keys.*

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be running at `http://localhost:5173/`. If you need to access it externally (e.g., via mobile), you can use `ngrok`.

## 📱 Mobile Support
The platform is fully responsive and optimized for mobile devices, including complex interactive elements like the Record Book table cards and the Timetable Wizard steps.

## 🔒 Security
Please ensure you do not commit your `.env` files or Google Cloud service account keys (e.g., `serviceAccountKey.json`). These are already handled in the `.gitignore`.
