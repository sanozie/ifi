//
//  ChatMessage.swift
//  Ifi
//
//  Created on 8/25/25.
//

import Foundation
import SwiftData

/// Represents a message in a chat conversation
@Model
final class ChatMessage: Codable, Identifiable {
    // MARK: - Properties
    
    @Attribute(.unique) var id: String
    var content: String
    var role: MessageRole
    var timestamp: Date
    
    /// ID of the parent chat thread (simple reference to break circular macro dependency)
    var threadId: String
    
    // Optional properties for analytics
    var tokensPrompt: Int?
    var tokensCompletion: Int?
    var costUsd: Double?
    
    // MARK: - Computed Properties
    
    /// Returns true if the message is from the assistant
    var isFromAssistant: Bool {
        return role == .assistant
    }
    
    /// Returns true if the message is from the user
    var isFromUser: Bool {
        return role == .user
    }
    
    /// Returns a formatted time string for display
    var formattedTime: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: timestamp)
    }
    
    // MARK: - Initializers
    
    init(id: String = UUID().uuidString,
         content: String,
         role: MessageRole,
         threadId: String,
         timestamp: Date = Date(),
         tokensPrompt: Int? = nil,
         tokensCompletion: Int? = nil,
         costUsd: Double? = nil) {
        self.id = id
        self.content = content
        self.role = role
        self.threadId = threadId
        self.timestamp = timestamp
        self.tokensPrompt = tokensPrompt
        self.tokensCompletion = tokensCompletion
        self.costUsd = costUsd
    }
    
    // MARK: - Codable
    
    enum CodingKeys: String, CodingKey {
        case id, content, role, timestamp, threadId, tokensPrompt, tokensCompletion, costUsd
    }
    
    required init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        content = try container.decode(String.self, forKey: .content)
        role = try container.decode(MessageRole.self, forKey: .role)
        timestamp = try container.decode(Date.self, forKey: .timestamp)
        threadId = try container.decode(String.self, forKey: .threadId)
        tokensPrompt = try container.decodeIfPresent(Int.self, forKey: .tokensPrompt)
        tokensCompletion = try container.decodeIfPresent(Int.self, forKey: .tokensCompletion)
        costUsd = try container.decodeIfPresent(Double.self, forKey: .costUsd)
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(content, forKey: .content)
        try container.encode(role, forKey: .role)
        try container.encode(timestamp, forKey: .timestamp)
        try container.encode(threadId, forKey: .threadId)
        try container.encodeIfPresent(tokensPrompt, forKey: .tokensPrompt)
        try container.encodeIfPresent(tokensCompletion, forKey: .tokensCompletion)
        try container.encodeIfPresent(costUsd, forKey: .costUsd)
    }

} // MARK: - end ChatMessage


/// Represents the role of a message sender
enum MessageRole: String, Codable {
    case user
    case assistant
    case system
    case tool
}
