//
//  ChatViewModel.swift
//  Ifi
//
//  Created on 8/25/25.
//

import Foundation
import Combine
import SwiftUI
import SwiftData

/// ViewModel responsible for managing chat state and interactions
class ChatViewModel: ObservableObject {
    // MARK: - Published Properties
    
    /// Current messages in the active thread
    @Published var messages: [ChatMessage] = []
    
    /// Text being composed by the user
    @Published var inputText: String = ""
    
    /// Loading state for the chat interface
    @Published var isLoading: Bool = false
    
    /// Error message to display, if any
    @Published var errorMessage: String? = nil
    
    /// Whether an error alert should be shown
    @Published var showError: Bool = false
    
    /// The current streaming response text (before it's committed as a message)
    @Published var streamingResponse: String = ""
    
    /// Whether the assistant is currently streaming a response
    @Published var isStreaming: Bool = false
    
    /// The active chat thread
    @Published var currentThread: ChatThread?
    
    // MARK: - Private Properties
    
    /// API client for network requests
    private let apiClient: APIClient
    
    /// ModelContext for SwiftData operations
    private let modelContext: ModelContext
    
    /// Set of cancellables for managing Combine subscriptions
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    
    /// Initialize with dependencies
    /// - Parameters:
    ///   - apiClient: The API client for network requests
    ///   - modelContext: The SwiftData model context
    init(apiClient: APIClient, modelContext: ModelContext) {
        self.apiClient = apiClient
        self.modelContext = modelContext
    }
    
    // MARK: - Public Methods
    
    /// Send a message and handle the response
    /// - Parameter text: The message text to send
    func sendMessage() {
        guard !inputText.isEmpty else { return }
        guard !isLoading && !isStreaming else { return }
        
        // Capture the input text and clear the input field
        let messageText = inputText
        inputText = ""
        
        // Set loading state
        isLoading = true
        errorMessage = nil
        
        // Create or use existing thread
        let threadId = currentThread?.id
        
        // Create and save user message
        let userMessage = createMessage(content: messageText, role: .user)
        saveMessage(userMessage)
        
        // Create a placeholder for the assistant's response
        streamingResponse = ""
        isStreaming = true
        
        // Send the message to the API
        apiClient.sendChatMessage(
            message: messageText,
            threadId: threadId,
            handler: self
        )
    }
    
    /// Create a new chat thread
    /// - Parameter title: The title for the new thread
    func createNewThread(title: String = "New Chat") {
        // Create a new thread
        let thread = ChatThread(title: title)
        
        // Save to SwiftData
        modelContext.insert(thread)
        try? modelContext.save()
        
        // Set as current thread
        currentThread = thread
        messages = []
        streamingResponse = ""
    }
    
    /// Load an existing thread
    /// - Parameter thread: The thread to load
    func loadThread(_ thread: ChatThread) {
        currentThread = thread
        
        // Load messages from the thread
        messages = thread.fetchMessages()
        
        streamingResponse = ""
    }
    
    /// Cancel the current streaming response
    func cancelStreaming() {
        apiClient.cancelCurrentRequest()
        isStreaming = false
        
        // If we have partial streaming response, save it
        if !streamingResponse.isEmpty {
            let assistantMessage = createMessage(content: streamingResponse, role: .assistant)
            saveMessage(assistantMessage)
            streamingResponse = ""
        }
    }
    
    /// Retry sending the last user message
    func retryLastMessage() {
        guard let lastUserMessage = messages.last(where: { $0.role == .user }) else {
            return
        }
        
        // Set the input text to the last user message and send it
        inputText = lastUserMessage.content
        sendMessage()
    }
    
    // MARK: - Private Methods
    
    /// Create a new message
    /// - Parameters:
    ///   - content: The message content
    ///   - role: The message role (user, assistant, etc.)
    /// - Returns: A new ChatMessage instance
    private func createMessage(content: String, role: MessageRole) -> ChatMessage {
        // Ensure we have a thread
        if currentThread == nil {
            createNewThread()
        }
        
        return ChatMessage(
            content: content,
            role: role,
            threadId: currentThread!.id
        )
    }
    
    /// Save a message to SwiftData
    /// - Parameter message: The message to save
    private func saveMessage(_ message: ChatMessage) {
        // Add to the local array
        messages.append(message)
        
        // Save to SwiftData
        modelContext.insert(message)
        
        // Update thread's updatedAt timestamp
        if let thread = currentThread {
            thread.updatedAt = Date()
            try? modelContext.save()
        }
    }
    
    /// Handle an error
    /// - Parameter error: The error to handle
    private func handleInternalError(_ error: Error) {
        isLoading = false
        isStreaming = false
        
        // Set error message based on the error type
        if let apiError = error as? APIError {
            errorMessage = apiError.localizedDescription
        } else {
            errorMessage = error.localizedDescription
        }
        
        showError = true
    }
    
    /// Commit the streaming response as a permanent message
    private func commitStreamingResponse() {
        guard !streamingResponse.isEmpty else { return }
        
        let assistantMessage = createMessage(content: streamingResponse, role: .assistant)
        saveMessage(assistantMessage)
        streamingResponse = ""
    }
}

// MARK: - StreamHandler Extension

extension ChatViewModel: StreamHandler {
    func handleChunk(_ text: String) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // Append the chunk to the streaming response
            self.streamingResponse += text
            
            // Ensure loading state is false once streaming starts
            if self.isLoading {
                self.isLoading = false
            }
            
            // Ensure streaming flag is set
            self.isStreaming = true
        }
    }
    
    func handleCompletion() {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // Commit the streaming response as a permanent message
            self.commitStreamingResponse()
            
            // Reset states
            self.isLoading = false
            self.isStreaming = false
        }
    }
    
    func handleError(_ error: Error) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            
            // If we have partial streaming response, save it
            if !self.streamingResponse.isEmpty {
                self.commitStreamingResponse()
            }
            
            // Handle the error
            self.handleInternalError(error)
        }
    }
}
