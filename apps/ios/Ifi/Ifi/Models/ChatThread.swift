//
//  ChatThread.swift
//  Ifi
//
//  Created on 8/25/25.
//

import Foundation
import SwiftData

/// Represents a conversation thread containing multiple messages
@Model
final class ChatThread: Codable, Identifiable {
    // MARK: - Properties
    
    @Attribute(.unique) var id: String
    var title: String
    var createdAt: Date
    var updatedAt: Date
    
    // MARK: - Computed Properties
    
    /// Returns the last message in the thread, if any
    var lastMessage: ChatMessage? {
        let context = modelContext!
        // `fetchLimit` is not currently supported by `FetchDescriptor`.
        // We fetch with the desired predicate & sort order, then return the
        // first element (newest) manually.
        let descriptor = FetchDescriptor<ChatMessage>(
            predicate: #Predicate<ChatMessage> { $0.threadId == self.id },
            sortBy: [SortDescriptor(\.timestamp, order: .reverse)]
        )

        return try? context.fetch(descriptor).first
    }
    
    /// Returns a preview of the thread content for display in lists
    var previewText: String {
        guard let lastMessage = lastMessage else {
            return "No messages"
        }
        
        // Truncate content if needed
        let maxLength = 50
        let content = lastMessage.content
        if content.count > maxLength {
            return String(content.prefix(maxLength)) + "..."
        }
        return content
    }
    
    /// Returns a formatted date string for display
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        return formatter.string(from: updatedAt)
    }
    
    /// Returns a formatted time string for display
    var formattedTime: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: updatedAt)
    }
    
    // MARK: - Initializers
    
    init(id: String = UUID().uuidString,
         title: String,
         createdAt: Date = Date(),
         updatedAt: Date = Date()) {
        self.id = id
        self.title = title
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
    
    // MARK: - Message Management
    
    /// Fetches all messages for this thread
    /// - Returns: Array of messages sorted by timestamp
    func fetchMessages() -> [ChatMessage] {
        guard let context = modelContext else { return [] }
        
        let descriptor = FetchDescriptor<ChatMessage>(
            predicate: #Predicate<ChatMessage> { $0.threadId == self.id },
            sortBy: [SortDescriptor(\.timestamp)]
        )
        
        return (try? context.fetch(descriptor)) ?? []
    }
    
    /// Adds a new message to this thread
    /// - Parameters:
    ///   - content: The message content
    ///   - role: The message role (user, assistant, etc.)
    /// - Returns: The newly created message
    @discardableResult
    func addMessage(content: String, role: MessageRole) -> ChatMessage {
        guard let context = modelContext else {
            fatalError("Cannot add message - model context is nil")
        }
        
        let message = ChatMessage(
            content: content,
            role: role,
            threadId: self.id
        )
        
        context.insert(message)
        self.updatedAt = Date()
        
        return message
    }
    
    /// Deletes all messages in this thread
    func clearMessages() {
        guard let context = modelContext else { return }
        
        let messages = fetchMessages()
        for message in messages {
            context.delete(message)
        }
        
        self.updatedAt = Date()
    }
    
    // MARK: - Codable
    
    enum CodingKeys: String, CodingKey {
        case id, title, createdAt, updatedAt
    }
    
    required init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(title, forKey: .title)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
    }
}
