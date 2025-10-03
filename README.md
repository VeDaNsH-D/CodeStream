# Code Stream ⚡
_A Real-Time, Collaborative Code Editor in Your Browser._

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Tech: Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![Editor: Monaco](https://img.shields.io/badge/Editor-Monaco-blueviolet?logo=visualstudiocode&logoColor=white)
![Sockets: Socket.IO](https://img.shields.io/badge/Real--Time-Socket.IO-yellow?logo=socketdotio&logoColor=black)

Code Stream is a web-based, real-time collaborative code editor built for on-the-fly pair programming sessions and technical interviews. It requires **no user accounts or data storage**. Simply create a room, share the URL, and start coding. All session data is ephemeral, held in memory, and completely wiped when the last person leaves the room.

**[Live Demo] -> `(https://collabeditor-3q3m.onrender.com/)`**

![Code Stream Demo GIF](https://i.imgur.com/your-demo.gif)

---
## ✨ Core Features

* **🔗 Real-Time Syncing:** Code, create, rename, and delete files with changes synced instantly across all participants.
* **🚀 Remote Code Execution:** Securely compile and run code in **C, C++, Java, JavaScript, and Python** with `stdin` support, powered by the Judge0 API.
* **💻 Monaco Editor:** Integrates the powerful editor that drives VS Code, providing a premium editing experience with rich syntax highlighting and intelligence.
* **🎨 Dual Theme:** A sleek UI with a full **light/dark mode** toggle. Your preference is saved in your browser for your next visit.
* **📹 Video & Screen Sharing:** Built-in peer-to-peer video/audio chat and screen sharing powered by WebRTC for seamless communication.
* **🕵️‍♂️ Anti-Cheat & Activity Log:** A persistent dashboard logs important events like users joining/leaving, running code, and large paste detection (>50 characters).
* **📦 Zero-Config Setup:** No databases, no user accounts. Just a lightweight Node.js server and a single HTML file.
* **📥 Project Download:** Download the entire workspace as a `.zip` file at any time.

---
## 🛠️ Technology Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | **HTML**, **Tailwind CSS** | Structure and styling of the user interface. |
| | **JavaScript (ES6+)** | Handles all client-side logic, UI events, and state management. |
| | **Monaco Editor** | The core code editing component. |
| | **Socket.IO Client** | Establishes and manages the real-time connection to the server. |
| | **WebRTC** | Enables direct browser-to-browser video, audio, and screen sharing. |
| | **JSZip** | Packages project files into a `.zip` for download. |
| **Backend** | **Node.js** | The JavaScript runtime environment for the server. |
| | **Express.js** | A minimal framework to serve the frontend files. |
| | **Socket.IO Server** | The heart of collaboration; manages rooms and message broadcasting. |
| **Services** | **Judge0 API** | Secure, sandboxed execution of user-submitted code. |
| | **Render** | The cloud platform for deploying the application. |

---
## 📂 Project Structure
The project is organized for a professional build and deployment workflow.
