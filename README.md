# EduSync - SEC Productivity App

EduSync is a comprehensive academic productivity platform designed to streamline operations for students and administrators. It features AI-powered tools that automate traditionally manual tasks such as timetable generation and lab record creation, all wrapped in a modern, responsive interface ("Clean Sync" design system). The platform is available as a web app, a Progressive Web App (PWA), and a packaged Android Application.

## 🌟 Key Features

* **AI Schedule Crafter (Timetable Maker):** 
  An intelligent wizard that parses unstructured timetable data and generates a structured, printable weekly exam/class schedule. It supports constraints like staff assignments and slot pinning.
* **Record Book Forge (AI Record Book PDF Maker):** 
  A tool for students to automatically generate professional PDF lab records. It integrates with GitHub to verify live repository URLs and maps them to administrative subject guidelines.
* **Student Academic Portal:** 
  Includes attendance tracking, a GPA calculator, an interactive Q&A board, announcements, and a centralized academic calendar.
* **Administrative Dashboard:**
  Provides secure controls for moderating subject-repository mappings, managing schedules, posting announcements, and performing targeted database resets.
* **Cross-Platform Availability:**
  Built with Vite PWA and packaged as an Android APK via Trusted Web Activity (TWA).

## 🛠 Tech Stack

* **Frontend:** Vanilla JavaScript, HTML5, CSS3, Vite
* **Backend / Database:** Hybrid architecture using Supabase and Firebase
* **AI Integration:** NVIDIA AI endpoints utilizing advanced LLMs (e.g., Llama 3.3 70B) for parsing unstructured data and generating structured outputs.
* **Styling:** Custom "Clean Sync" CSS framework (Mobile-first, responsive design)
* **Mobile Build:** PWA & TWA (Bubblewrap/Gradle) for Android APK generation

## 🚀 Getting Started

### Prerequisites

* Node.js (v18 or higher recommended)
* Git
* Java SDK (for Android APK building)

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
   *Edit the `.env` file to include your Supabase, Firebase, and NVIDIA AI keys.*

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be running at `http://localhost:5173/`. If you need to access it externally (e.g., via mobile), you can use `ngrok`.

## 📱 Mobile Support & Android App
The platform is fully responsive and optimized for mobile devices. It can be installed directly as a PWA, or built into an Android APK using the included `gradlew` scripts and `twa-manifest.json` configuration.

## 🔒 Security
Please ensure you do not commit your `.env` files or Google Cloud service account keys (e.g., `serviceAccountKey.json`). These are already handled in the `.gitignore`.
