//
//  ChatView.swift
//  Ifi
//
//  Created on 8/25/25.
//

import SwiftUI
import SwiftData

struct ChatView: View {
    // MARK: - Properties
    
    @ObservedObject var viewModel: ChatViewModel
    @Environment(\.colorScheme) private var colorScheme
    @State private var scrollViewProxy: ScrollViewProxy? = nil
    @State private var messageInputHeight: CGFloat = 40
    @FocusState private var isInputFocused: Bool
    
    // MARK: - Constants
    
    private let maxInputHeight: CGFloat = 120
    private let minInputHeight: CGFloat = 40
    private let scrollToBottomThreshold: CGFloat = 200
    private let typingIndicatorId = "typingIndicator"
    
    // MARK: - Body
    
    var body: some View {
        ZStack(alignment: .bottom) {
            // Chat messages
            messagesView
                .padding(.bottom, 60) // Space for input bar
            
            VStack(spacing: 0) {
                Spacer()
                
                // Input bar
                inputBar
                    .background(
                        colorScheme == .dark ? 
                            Color(UIColor.systemBackground) : 
                            Color(UIColor.secondarySystemBackground)
                    )
                    .shadow(color: Color.black.opacity(0.1), radius: 5, x: 0, y: -2)
            }
        }
        .navigationTitle(viewModel.currentThread?.title ?? "Chat")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                if viewModel.isStreaming {
                    Button("Stop") {
                        viewModel.cancelStreaming()
                    }
                    .foregroundColor(.red)
                    .accessibilityLabel("Stop response")
                }
            }
        }
        .alert(isPresented: $viewModel.showError, content: {
            Alert(
                title: Text("Error"),
                message: Text(viewModel.errorMessage ?? "An unknown error occurred"),
                primaryButton: .default(Text("Retry")) {
                    viewModel.retryLastMessage()
                },
                secondaryButton: .cancel(Text("Dismiss"))
            )
        })
        .onAppear {
            // Create a new thread if needed
            if viewModel.currentThread == nil {
                viewModel.createNewThread()
            }
        }
    }
    
    // MARK: - Message List
    
    private var messagesView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(viewModel.messages) { message in
                        MessageBubble(message: message, colorScheme: colorScheme)
                            .id(message.id)
                    }
                    
                    // Streaming response bubble (if active)
                    if !viewModel.streamingResponse.isEmpty {
                        MessageBubble(
                            message: ChatMessage(
                                content: viewModel.streamingResponse,
                                role: .assistant,
                                threadId: viewModel.currentThread?.id ?? ""
                            ),
                            isStreaming: true,
                            colorScheme: colorScheme
                        )
                        .id(typingIndicatorId)
                    }
                    
                    // Typing indicator (when loading)
                    if viewModel.isLoading {
                        TypingIndicator()
                            .id(typingIndicatorId)
                    }
                    
                    // Invisible spacer view for scrolling target
                    Color.clear
                        .frame(height: 1)
                        .id("bottomScrollAnchor")
                }
                .padding(.horizontal)
                .padding(.top, 12)
                .padding(.bottom, 8)
            }
            .onAppear {
                scrollViewProxy = proxy
                scrollToBottom(animated: false)
            }
            .onChange(of: viewModel.messages.count) { _, _ in
                scrollToBottom()
            }
            .onChange(of: viewModel.streamingResponse) { _, _ in
                scrollToBottom()
            }
            .onChange(of: viewModel.isLoading) { _, _ in
                scrollToBottom()
            }
        }
    }
    
    // MARK: - Input Bar
    
    private var inputBar: some View {
        VStack(spacing: 0) {
            Divider()
            
            HStack(alignment: .bottom, spacing: 10) {
                // Text input field
                ZStack(alignment: .leading) {
                    // Background
                    RoundedRectangle(cornerRadius: 18)
                        .fill(colorScheme == .dark ? 
                              Color(UIColor.systemGray6) : 
                              Color(UIColor.systemGray5))
                    
                    // Text editor
                    TextEditor(text: $viewModel.inputText)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .frame(minHeight: minInputHeight, maxHeight: maxInputHeight)
                        .background(Color.clear)
                        .focused($isInputFocused)
                        .onChange(of: viewModel.inputText) { _, _ in
                            // Adjust height based on content
                            withAnimation(.easeInOut(duration: 0.2)) {
                                let size = CGSize(
                                    width: UIScreen.main.bounds.width - 100,
                                    height: .infinity
                                )
                                let estimatedHeight = viewModel.inputText.boundingRect(
                                    with: size,
                                    options: .usesLineFragmentOrigin,
                                    attributes: [.font: UIFont.preferredFont(forTextStyle: .body)],
                                    context: nil
                                ).height + 24
                                
                                messageInputHeight = min(
                                    max(estimatedHeight, minInputHeight),
                                    maxInputHeight
                                )
                            }
                        }
                        .accessibilityLabel("Message input")
                    
                    // Placeholder text
                    if viewModel.inputText.isEmpty {
                        Text("Message")
                            .foregroundColor(Color(UIColor.placeholderText))
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .allowsHitTesting(false)
                    }
                }
                .frame(height: messageInputHeight)
                
                // Send button
                Button(action: {
                    viewModel.sendMessage()
                    isInputFocused = false
                }) {
                    Image(systemName: "arrow.up.circle.fill")
                        .resizable()
                        .frame(width: 32, height: 32)
                        .foregroundColor(.accentColor)
                        .contentShape(Circle())
                }
                .disabled(viewModel.inputText.isEmpty || viewModel.isLoading || viewModel.isStreaming)
                .opacity(viewModel.inputText.isEmpty ? 0.5 : 1.0)
                .accessibilityLabel("Send message")
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
    }
    
    // MARK: - Helper Methods
    
    private func scrollToBottom(animated: Bool = true) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            withAnimation(animated ? .easeOut(duration: 0.3) : nil) {
                scrollViewProxy?.scrollTo("bottomScrollAnchor", anchor: .bottom)
            }
        }
    }
}

// MARK: - Message Bubble

struct MessageBubble: View {
    let message: ChatMessage
    var isStreaming: Bool = false
    let colorScheme: ColorScheme
    
    private var isFromUser: Bool {
        return message.role == .user
    }
    
    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if isFromUser {
                Spacer(minLength: 60)
            }
            
            VStack(alignment: isFromUser ? .trailing : .leading, spacing: 4) {
                // Message content
                Group {
                    // Assistant messages (final, not streaming) render Markdown
                    if !isFromUser && !isStreaming {
                        MarkdownText(markdown: message.content)
                    } else {
                        // User messages and live-streaming chunks render plain text
                        Text(message.content)
                    }
                }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(
                        isFromUser ?
                            Color.accentColor :
                            (colorScheme == .dark ?
                                Color(UIColor.systemGray5) :
                                Color(UIColor.systemGray6))
                    )
                    .foregroundColor(isFromUser ? .white : Color.primary)
                    .cornerRadius(18)
                    .contextMenu {
                        Button(action: {
                            UIPasteboard.general.string = message.content
                        }) {
                            Label("Copy", systemImage: "doc.on.doc")
                        }
                    }
                
                // Timestamp
                if !isStreaming {
                    Text(message.formattedTime)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 4)
                }
            }
            
            if !isFromUser {
                Spacer(minLength: 60)
            }
        }
        .padding(.vertical, 2)
        .id(message.id)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(isFromUser ? "You" : "Assistant") said \(message.content)")
        .accessibilityHint(isFromUser ? "Your message" : "Assistant's response")
    }
}

// MARK: - Markdown Renderer

/// Lightweight Markdown renderer that falls back to plain text on failure.
/// Uses `AttributedString(markdown:)`, available from iOS 15+.
struct MarkdownText: View {
    let markdown: String
    
    var body: some View {
        if let attributed = try? AttributedString(markdown: markdown) {
            Text(attributed)
        } else {
            // Fallback for malformed Markdown
            Text(markdown)
        }
    }
}

// MARK: - Typing Indicator

struct TypingIndicator: View {
    @State private var animationOffset: CGFloat = 0
    
    var body: some View {
        HStack(spacing: 12) {
            // Animated dots
            HStack(spacing: 4) {
                ForEach(0..<3) { index in
                    Circle()
                        .fill(Color.secondary)
                        .frame(width: 8, height: 8)
                        .offset(y: animationOffset(for: index))
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color(UIColor.systemGray6))
            .cornerRadius(18)
            
            Spacer()
        }
        .padding(.vertical, 4)
        .onAppear {
            withAnimation(Animation.easeInOut(duration: 0.8).repeatForever()) {
                animationOffset = 1
            }
        }
        .accessibilityLabel("Assistant is typing")
    }
    
    private func animationOffset(for index: Int) -> CGFloat {
        let baseDelay = 0.2
        let delay = baseDelay * Double(index)
        return sin(animationOffset + .pi * 2 * delay) * 5
    }
}

// MARK: - String Extension

extension String {
    func boundingRect(with size: CGSize, options: NSStringDrawingOptions, attributes: [NSAttributedString.Key: Any]?, context: NSStringDrawingContext?) -> CGRect {
        return (self as NSString).boundingRect(with: size, options: options, attributes: attributes, context: context)
    }
}

// MARK: - Preview

#Preview {
    NavigationStack {
        let modelContainer = try! ModelContainer(for: ChatMessage.self, ChatThread.self)
        let modelContext = ModelContext(modelContainer)
        let apiClient = APIClient(baseURLString: "http://localhost:3000")
        let viewModel = ChatViewModel(apiClient: apiClient, modelContext: modelContext)
        
        // Add some sample messages for preview
        let thread = ChatThread(title: "Sample Chat")
        modelContext.insert(thread)
        
        let messages = [
            ChatMessage(content: "Hello! How can I help you today?", role: .assistant, threadId: thread.id, timestamp: Date().addingTimeInterval(-3600)),
            ChatMessage(content: "I need help implementing a new feature in my app.", role: .user, threadId: thread.id, timestamp: Date().addingTimeInterval(-3500)),
            ChatMessage(content: "Sure, I'd be happy to help. What kind of feature are you trying to implement?", role: .assistant, threadId: thread.id, timestamp: Date().addingTimeInterval(-3400)),
            ChatMessage(content: "I want to add a chat interface that can stream responses from an AI API.", role: .user, threadId: thread.id, timestamp: Date().addingTimeInterval(-3300))
        ]
        
        for message in messages {
            modelContext.insert(message)
        }
        
        viewModel.currentThread = thread
        viewModel.messages = messages
        
        return ChatView(viewModel: viewModel)
    }
}
