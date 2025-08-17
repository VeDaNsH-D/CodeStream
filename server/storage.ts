import { type User, type InsertUser, type Project, type InsertProject, type File, type InsertFile, type ChatMessage, type InsertChatMessage, type AiSession, type InsertAiSession } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUser(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;
  
  // Files
  getFile(id: string): Promise<File | undefined>;
  getFilesByProject(projectId: string): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: string, updates: Partial<File>): Promise<File | undefined>;
  deleteFile(id: string): Promise<boolean>;
  
  // Chat Messages
  getChatMessage(id: string): Promise<ChatMessage | undefined>;
  getChatMessagesByProject(projectId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  // AI Sessions
  getAiSession(id: string): Promise<AiSession | undefined>;
  getAiSessionsByUser(userId: string): Promise<AiSession[]>;
  createAiSession(session: InsertAiSession): Promise<AiSession>;
  updateAiSession(id: string, updates: Partial<AiSession>): Promise<AiSession | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private projects: Map<string, Project> = new Map();
  private files: Map<string, File> = new Map();
  private chatMessages: Map<string, ChatMessage> = new Map();
  private aiSessions: Map<string, AiSession> = new Map();

  constructor() {
    // Initialize with a default user
    const defaultUser: User = {
      id: "user-1",
      username: "demo",
      email: "demo@codecollab.com",
      avatar: null,
      createdAt: new Date(),
    };
    this.users.set(defaultUser.id, defaultUser);

    // Initialize with a default project
    const defaultProject: Project = {
      id: "project-1",
      name: "Demo Project",
      description: "A collaborative coding project",
      ownerId: defaultUser.id,
      collaborators: [defaultUser.id],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(defaultProject.id, defaultProject);

    // Initialize with sample files
    const pythonFile: File = {
      id: "file-1",
      name: "main.py",
      content: `# Python implementation of collaborative sorting algorithm
import numpy as np
from typing import List, Optional

class CollaborativeSort:
    def __init__(self, algorithm: str = "quicksort"):
        self.algorithm = algorithm
        self.participants = []
    
    def add_participant(self, user_id: str):
        # Add participant to collaborative session
        if user_id not in self.participants:
            self.participants.append(user_id)
            return True
        return False
    
    def sort_data(self, data: List[int]) -> List[int]:
        # Implementation of sorting algorithm
        if self.algorithm == "quicksort":
            return self._quicksort(data)
        elif self.algorithm == "mergesort":
            return self._mergesort(data)
            
    def _quicksort(self, data: List[int]) -> List[int]:
        if len(data) <= 1:
            return data
        
        pivot = data[len(data) // 2]
        left = [x for x in data if x < pivot]
        middle = [x for x in data if x == pivot]
        right = [x for x in data if x > pivot]
        
        return self._quicksort(left) + middle + self._quicksort(right)
`,
      language: "python",
      projectId: defaultProject.id,
      path: "/main.py",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.files.set(pythonFile.id, pythonFile);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      avatar: insertUser.avatar ?? null,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Project methods
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUser(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(
      project => project.ownerId === userId || (project.collaborators && project.collaborators.includes(userId))
    );
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const project: Project = {
      ...insertProject,
      id,
      description: insertProject.description ?? null,
      collaborators: Array.isArray(insertProject.collaborators) ? insertProject.collaborators : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = { 
      ...project, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: string): Promise<boolean> {
    return this.projects.delete(id);
  }

  // File methods
  async getFile(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesByProject(projectId: string): Promise<File[]> {
    return Array.from(this.files.values()).filter(file => file.projectId === projectId);
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const file: File = {
      ...insertFile,
      id,
      content: insertFile.content ?? "",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.files.set(id, file);
    return file;
  }

  async updateFile(id: string, updates: Partial<File>): Promise<File | undefined> {
    const file = this.files.get(id);
    if (!file) return undefined;
    
    const updatedFile = { 
      ...file, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.files.set(id, updatedFile);
    return updatedFile;
  }

  async deleteFile(id: string): Promise<boolean> {
    return this.files.delete(id);
  }

  // Chat message methods
  async getChatMessage(id: string): Promise<ChatMessage | undefined> {
    return this.chatMessages.get(id);
  }

  async getChatMessagesByProject(projectId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.projectId === projectId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      messageType: insertMessage.messageType ?? "text",
      createdAt: new Date(),
    };
    this.chatMessages.set(id, message);
    return message;
  }

  // AI session methods
  async getAiSession(id: string): Promise<AiSession | undefined> {
    return this.aiSessions.get(id);
  }

  async getAiSessionsByUser(userId: string): Promise<AiSession[]> {
    return Array.from(this.aiSessions.values()).filter(session => session.userId === userId);
  }

  async createAiSession(insertSession: InsertAiSession): Promise<AiSession> {
    const id = randomUUID();
    const session: AiSession = {
      ...insertSession,
      id,
      projectId: insertSession.projectId ?? null,
      messages: Array.isArray(insertSession.messages) ? insertSession.messages : [],
      createdAt: new Date(),
    };
    this.aiSessions.set(id, session);
    return session;
  }

  async updateAiSession(id: string, updates: Partial<AiSession>): Promise<AiSession | undefined> {
    const session = this.aiSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.aiSessions.set(id, updatedSession);
    return updatedSession;
  }
}

export const storage = new MemStorage();
