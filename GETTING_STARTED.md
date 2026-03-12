# 🚀 Getting Started with Federated Social

Welcome to **Federated Social**, a decentralized social networking platform! This guide will help you set up the project on your local machine and start exploring its features.

---

## 📋 Table of Contents
1. [Prerequisites](#-prerequisites)
2. [Setup Options](#️-setup-options)
   - [Option 1: Using Docker (Fastest)](#option-1-using-docker-fastest)
   - [Option 2: Local Development](#option-2-local-development)
3. [Using the Platform](#-using-the-platform)
4. [Troubleshooting](#-troubleshooting)

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Docker & Docker Compose** (Highly Recommended)
- **Node.js 18+** & **npm** (For frontend development)
- **Go 1.21+** (For backend development)
- **Git**

---

## 🛠️ Setup Options

### Option 1: Using Docker (Fastest)

The easiest way to get the platform running is using Docker Compose.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/RiteeshTM/Federated-Decentralized-Social-Networking-Platform.git
   cd Federated-Decentralized-Social-Networking-Platform
   ```

2. **Start the containers:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - **Frontend:** [http://localhost:5173](http://localhost:5173) (or the port specified in the console)
   - **Backend API:** [http://localhost:8080](http://localhost:8080)
   - **Database (MongoDB):** `localhost:27017`

---

### Option 2: Local Development

If you want to run the services individually for development:

#### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create a `.env` file (see [Environment Variables](#-environment-variables)).
3. Install dependencies and run:
   ```bash
   go mod download
   go run main.go
   ```

#### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```


---

## 📱 Using the Platform

### 1. Create an Account
- Go to the **Signup** page.
- Choose a unique username and a strong password.
- Each instance manages its own users, so pick a username that represents you!

### 2. Login & Security
- Log in with your email and password.
- **OTP Verification:** If configured, check your email for a verification code.
- **Password Security:** You can change your password anytime in **Settings > Privacy & Security**.

### 3. Manage Your Profile
- Navigate to the **Profile** page or **Settings**.
- Click **Edit Profile** to change your display name and bio.
- **Privacy Controls:** Set your profile to **Public**, **Followers Only**, or **Private**.
  - *Public:* Anyone can see your posts.
  - *Followers Only:* Only approved followers can view your content.

### 4. Interactions
- **Posts:** Share updates on the dashboard.
- **Feed:** See posts from people you follow.
- **Comments & Likes:** Engage with other users' content with our premium animated UI.

---


## ❓ Troubleshooting

**Q: I can't connect to MongoDB.**
- A: Ensure Docker is running or check your `MONGO_URI` in the `.env` file.

**Q: Frontend isn't loading styles properly.**
- A: Run `npm install` in the `frontend` folder to ensure all Tailwind dependencies are correctly installed.

**Q: My password isn't working.**
- A: We use Bcrypt for hashing. If you lost your password and haven't set up recovery, you'll need to reset it manually in the database for now.

