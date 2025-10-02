# Pattern Directory & Quick Reference Guide

**Purpose**: Comprehensive index of all architectural patterns with problem-to-solution mapping
**For Claude Code**: Read this file FIRST to identify relevant patterns before implementation
**Last Updated**: October 2, 2025

**Latest Changes**:
- Added Pattern 23 with shared HMAC utilities documentation
- Added CDN & Security issues quick reference section
- Indexed Patterns 18-23 (AI, State Machines, CDN, HMAC)

---

## 🎯 How to Use This Directory

1. **Identify your problem type** using the quick reference sections below
2. **Find the relevant pattern number** and description
3. **Read the specific pattern file** for detailed implementation guidance
4. **Follow architectural principles** from Pattern 00 throughout implementation

---

## 📋 Complete Pattern Index

### **Architecture & Principles**
- **00-Architecture-Principles** (2 versions: latest is 08) - 3-Layer SSOT distribution, layer boundaries, data flow principles
- **01-Optimistic-Updates-Pattern** - TanStack Query optimistic updates with rollback
- **03-Proven-Patterns** - Battle-tested implementation patterns
- **04-Backend-Integration-Lessons-Learned** - Server integration best practices
- **05-Server-Actions-vs-API-Routes-Pattern** - When to use server actions vs API routes

### **Authentication & Security**
- **06-Server-Side-Auth-With-Zustand-Pattern** - Authentication state management
- **07-Serverside-Auth-Flow** - Complete authentication flow patterns

### **Form & State Management**
- **09-Professional-Form-State-React-Key-Stability-Patterns** - Professional form state management, preventing character loss and infinite loops

### **Upload & File Management**
- **02-Video-Upload-Delete-Pattern** - Secure video management with professional UX
- **10-Complete-Upload-System-File-Map** - Comprehensive upload infrastructure mapping (30+ files)
- **16-Multiple-Video-Upload-Management-Pattern** - Batch video upload handling
- **16A-Multiple-Video-Upload-Implementation-Pseudocode** - Implementation details for batch uploads
- **17-File-Based-UI-Transition-Pattern** - WhatsApp-style image uploads with zero skeleton flicker

### **Data Loading & Performance**
- **11-Concurrent-Query-Loading-Pattern** - Parallel data loading optimization
- **12-Chapter-Deletion-Video-Unlinking-Pattern** - Complex entity relationship management

### **UI & UX Patterns**
- **13-Skeleton-Component-System-Usage-Guide** - Loading state management and skeleton patterns
- **14-Error-Boundary-Pattern** - Error handling and recovery strategies
- **15-Bulk-Operations-Selection-Pattern** - Selection UI and bulk operations

### **AI & State Machine Patterns**
- **18-ai-agent-transcript-integration** - AI agent transcript integration patterns
- **19-state-machine-3layer-ssot-integration** - State machine integration with 3-layer architecture
- **20-CDN-Token-Media-Architecture-Pattern** - CloudFlare Worker CDN with HMAC tokens for media viewing
- **20A-Architecture-Principles-And-Design-Concepts** - Additional architecture principles
- **20B-State-Machine-3Layer-SSOT-Implementation-Analysis** - Deep-dive state machine implementation
- **21-Conversation-Attachments-CDN-Architecture** - CDN architecture for conversation attachments
- **22-Video-State-Machine-Architecture-Guide** - Video player state machine patterns
- **23-cdn-hmac-authentication-pattern** - **HMAC token generation, CDN authentication, shared utilities**

---

## 🚨 Problem → Pattern Quick Reference

### **Upload & File Issues**
| Problem | Pattern | Description |
|---------|---------|-------------|
| Skeleton flicker during image uploads | **17** | File-based UI transition pattern eliminates loading flickers |
| Video upload progress tracking | **02, 10, 16** | Complete video upload system with WebSocket progress |
| Batch file uploads | **16, 16A** | Multiple file upload management with queuing |
| Upload system architecture | **10** | Complete file map of upload infrastructure |

### **CDN & Security Issues**
| Problem | Pattern | Description |
|---------|---------|-------------|
| HMAC token generation for CDN | **23** | **Shared utilities for HMAC tokens, prevents code duplication** |
| Private URL to CDN conversion | **23** | Token generation for private storage URLs |
| Media viewing with CDN authentication | **20** | CloudFlare Worker CDN with HMAC token patterns |
| Conversation attachment CDN | **21** | CDN architecture for message attachments |
| Worker CDN access (FFmpeg/FFprobe) | **23** | Background worker utilities for CDN access |

### **State Management Issues**
| Problem | Pattern | Description |
|---------|---------|-------------|
| Form state character loss during typing | **09** | Professional form state with React key stability |
| Optimistic updates not working | **01** | TanStack Query optimistic update patterns |
| Layer boundary violations | **00, 08** | 3-Layer SSOT architecture principles |
| Authentication state management | **06, 07** | Server-side auth with Zustand integration |

### **UI & UX Issues**
| Problem | Pattern | Description |
|---------|---------|-------------|
| Poor loading states | **13** | Skeleton component system usage guide |
| Error handling inconsistency | **14** | Error boundary implementation patterns |
| Bulk operations UX | **15** | Selection patterns and bulk operation handling |
| Concurrent loading performance | **11** | Parallel query loading optimization |

### **Architecture & Integration Issues**
| Problem | Pattern | Description |
|---------|---------|-------------|
| Server actions vs API routes decision | **05** | When to use each approach |
| Backend integration problems | **04** | Lessons learned from integration challenges |
| Complex entity relationships | **12** | Deletion and unlinking pattern for related entities |
| General architecture violations | **00, 03, 08** | Core principles and proven patterns |

---

## 🏗️ Architecture Pattern Hierarchy

### **Foundation Layer** (Read First)
1. **Pattern 00/08** - Architecture Principles (3-Layer SSOT)
2. **Pattern 03** - Proven Patterns (Battle-tested approaches)
3. **Pattern 04** - Backend Integration Lessons

### **State Management Layer**
1. **Pattern 01** - Optimistic Updates
2. **Pattern 06/07** - Authentication Patterns
3. **Pattern 09** - Professional Form State

### **Feature Implementation Layer**
1. **Pattern 02/10/16/17** - Upload Systems
2. **Pattern 11/12** - Data Loading & Relationships
3. **Pattern 13/14/15** - UI/UX Patterns

---

## 🎯 Pattern Selection Decision Tree

### **For Upload/File Problems:**
```
Is it image uploads? → Pattern 17 (File-based transitions)
Is it video uploads? → Pattern 02 (Security) + Pattern 10 (Infrastructure)
Is it batch uploads? → Pattern 16/16A (Multiple upload management)
```

### **For State Management Problems:**
```
Form state issues? → Pattern 09 (Professional form state)
Optimistic updates? → Pattern 01 (TanStack optimistic patterns)
Auth state? → Pattern 06/07 (Server-side auth)
Architecture violations? → Pattern 00/08 (Core principles)
```

### **For UI/UX Problems:**
```
Loading states? → Pattern 13 (Skeleton systems)
Error handling? → Pattern 14 (Error boundaries)
Bulk operations? → Pattern 15 (Selection patterns)
Performance? → Pattern 11 (Concurrent loading)
```

---

## 📚 Pattern Implementation Guidelines

### **Before Starting Any Implementation:**
1. **Read Pattern 00/08** - Understand 3-Layer SSOT architecture
2. **Identify problem type** using quick reference above
3. **Read relevant pattern** for specific guidance
4. **Follow architectural principles** throughout implementation

### **When Creating New Patterns:**
- Number sequentially (next: 18)
- Include timestamp in filename
- Follow principle-focused format (avoid code-heavy documentation)
- Update this directory with new pattern information

### **Pattern Quality Standards:**
- ✅ **Principle-focused** - Emphasize "why" and "how to think"
- ✅ **Architecture-compliant** - Follow 3-Layer SSOT distribution
- ✅ **Battle-tested** - Based on real implementation experience
- ✅ **Reusable** - Applicable across multiple scenarios

---

## 🔍 Advanced Pattern Search

### **By Technology:**
- **TanStack Query**: Patterns 01, 11, 17, 20
- **Zustand**: Patterns 00, 06, 15, 16
- **Server Actions**: Patterns 02, 05, 10, 20, 21, 23
- **WebSocket**: Patterns 02, 10, 16, 17
- **Form Management**: Patterns 09, 17
- **CDN & HMAC**: Patterns 20, 21, 23
- **State Machines**: Patterns 19, 22
- **Background Workers**: Pattern 23

### **By Complexity:**
- **Foundation** (Essential): 00, 01, 03, 08, 23
- **Intermediate** (Feature-specific): 02, 09, 13, 14, 20, 21, 22
- **Advanced** (Complex scenarios): 10, 11, 15, 16, 17, 18, 19

### **By Use Case:**
- **Course Management**: 02, 08, 10, 12, 16
- **Student Experience**: 09, 13, 17, 22
- **Instructor Tools**: 15, 16
- **Real-time Features**: 02, 10, 17
- **Media & CDN**: 20, 21, 23
- **Background Processing**: 23
- **AI Integration**: 18, 19

This directory ensures efficient pattern discovery and prevents architectural inconsistencies across the codebase.