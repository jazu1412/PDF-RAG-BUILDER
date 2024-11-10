# PDF-RAG-Builder: AI-Powered Document Analysis System

## Tech Stack Overview

### Backend Infrastructure
- **Runtime**: Node.js
- **Server Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **AI Integration**: OpenAI API (text-embedding-3-small model)
- **PDF Processing**: PDFReader

### Key Dependencies
- **openai**: ^4.26.0 - For embedding generation
- **mongoose**: ^8.1.1 - MongoDB object modeling
- **express**: ^4.18.2 - Web server framework
- **pdfreader**: ^3.0.2 - PDF parsing capabilities
- **multer**: ^1.4.5-lts.1 - File upload handling

## AI Model & Database Architecture

### OpenAI Model Implementation
- **Model**: text-embedding-3-small
- **Purpose**: Semantic text embedding generation
- **Vector Dimensions**: High-dimensional floating-point vectors
- **Usage**: Text chunks → Numerical vector representations

### MongoDB Database Design
- **Connection**: Supports both MongoDB Atlas (mongodb+srv://) and local instances (mongodb://)
- **Schema Design**: DocumentUploadSchema
  ```javascript
  {
    title: String,          // Document section identifier
    description: String,    // Raw text content
    fileName: String,       // Source PDF name
    uploadDate: Date,       // Timestamp
    embedding: [Number]     // Vector representation
  }
  ```

## System Design & Data Flow

### 1. Document Processing Pipeline
```mermaid
graph LR
    A[PDF Upload] --> B[Text Extraction]
    B --> C[Text Chunking]
    C --> D[Embedding Generation]
    D --> E[MongoDB Storage]
```

### 2. Text Chunking System
- **Chunk Size**: 4000 tokens maximum
- **Chunking Strategy**: Sentence-based splitting
- **Preservation**: Maintains sentence integrity
- **Storage**: Each chunk stored with metadata and embedding

### 3. Query Processing Flow
```mermaid
graph LR
    A[User Query] --> B[Query Embedding]
    B --> C[Vector Similarity Search]
    C --> D[Relevant Chunks Retrieval]
    D --> E[Response Generation]
```



## System Architecture & Data Flow

### Complete System Overview
```mermaid
graph TB
    subgraph "Document Processing"
        A[PDF Upload] --> B[PDF Text Extraction]
        B --> C[Text Chunking]
        C --> D[Chunk Processing]
        D --> |4000 token chunks| E[OpenAI Embedding Generation]
        E --> F[MongoDB Storage]
    end

    subgraph "Query Processing"
        G[User Query] --> H[Query Embedding]
        H --> I[Vector Similarity Search]
        I --> J[Context Selection]
        J --> K[Response Generation]
    end

    subgraph "Database Layer"
        F --> |Store Documents| L[(MongoDB)]
        L --> |Retrieve Similar Docs| I
    end

    subgraph "Temporal Analysis"
        M[Year Detection] --> N{Multi-Year Query?}
        N --> |Yes| O[Compare Across Years]
        N --> |No| P[Single Year Analysis]
        O --> J
        P --> J
    end
```

### Chunk Creation Process
```mermaid
graph LR
    subgraph "Text Chunking System"
        A[Raw PDF Text] --> B[Split into Sentences]
        B --> C{Chunk Size Check}
        C --> |< 4000 tokens| D[Create Chunk]
        C --> |> 4000 tokens| E[Split Further]
        E --> C
        D --> F[Add Metadata]
        F --> G[Generate Embedding]
        G --> H[(Store in MongoDB)]
    end
```

### Query Processing Flow
```mermaid
sequenceDiagram
    participant U as User
    participant S as Server
    participant E as Embedding Service
    participant DB as MongoDB
    participant AI as OpenAI

    U->>S: Submit Query
    S->>E: Generate Query Embedding
    E->>AI: Request Embedding
    AI-->>E: Return Embedding Vector
    S->>DB: Find Similar Documents
    DB-->>S: Return Matched Documents
    S->>S: Process Year Detection
    alt Multiple Years Detected
        S->>S: Compare Across Years
    else Single Year
        S->>S: Single Context Analysis
    end
    S->>AI: Generate Response
    AI-->>S: Return Response
    S->>U: Send Final Answer
```

### Data Structure Flow
```mermaid
graph TD
    subgraph "Document Structure"
        A[PDF Document] --> B[Text Extraction]
        B --> C[Chunks]
        C --> |Metadata| D[Document Record]
        C --> |Content| E[Vector Embedding]
        D --> F[(MongoDB Document)]
        E --> F
    end

    subgraph "MongoDB Schema"
        F --> G[Title]
        F --> H[Description]
        F --> I[FileName]
        F --> J[UploadDate]
        F --> K[Embedding Array]
    end
```

## Execution Flow

### 1. Document Upload & Processing
```javascript
PDF Upload → Text Extraction → Chunk Creation → Embedding Generation → MongoDB Storage
```

### 2. Query Processing
```javascript
Query Input → Embedding Creation → Similarity Search → Response Formation
```

### 3. Vector Similarity Implementation
- Uses cosine similarity for comparing embeddings
- Optimized for semantic matching
- Supports contextual understanding


