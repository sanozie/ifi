//
//  ThreadListView.swift
//  Ifi
//
//  Created on 8/25/25.
//

import SwiftUI
import SwiftData

struct ThreadListView: View {
    // MARK: - Properties
    
    @Environment(\.modelContext) private var modelContext
    @Environment(\.colorScheme) private var colorScheme
    
    // Query all threads, sorted by most recent first
    @Query(sort: \ChatThread.updatedAt, order: .reverse) private var threads: [ChatThread]
    
    @State private var isLoading: Bool = false
    @State private var showNewThreadAlert: Bool = false
    @State private var newThreadTitle: String = ""
    
    // Dependency injection for API client
    private let apiClient: APIClient
    
    // MARK: - Initialization
    
    init(apiClient: APIClient) {
        self.apiClient = apiClient
    }
    
    // MARK: - Body
    
    var body: some View {
        NavigationStack {
            ZStack {
                // Main list view
                List {
                    ForEach(threads) { thread in
                        NavigationLink(destination: chatView(for: thread)) {
                            ThreadRow(thread: thread)
                        }
                        .accessibilityLabel("Chat thread: \(thread.title)")
                        .accessibilityHint("Last updated \(thread.formattedDate)")
                    }
                    .onDelete(perform: deleteThreads)
                }
                .listStyle(.insetGrouped)
                .navigationTitle("Chats")
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button(action: {
                            showNewThreadAlert = true
                        }) {
                            Image(systemName: "square.and.pencil")
                                .accessibilityLabel("New Chat")
                        }
                    }
                }
                .refreshable {
                    await refreshThreads()
                }
                .overlay {
                    // Empty state view
                    if threads.isEmpty && !isLoading {
                        ContentUnavailableView(
                            label: {
                                Label("No Chats", systemImage: "bubble.left.and.bubble.right")
                            },
                            description: {
                                Text("Start a new conversation by tapping the button in the top right.")
                            },
                            actions: {
                                Button("New Chat") {
                                    showNewThreadAlert = true
                                }
                                .buttonStyle(.borderedProminent)
                            }
                        )
                        .accessibilityLabel("No chat threads available")
                    }
                }
                
                // Loading overlay
                if isLoading {
                    ProgressView()
                        .scaleEffect(1.5)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.1))
                        .ignoresSafeArea()
                        .accessibilityLabel("Loading threads")
                }
            }
            .alert("New Chat", isPresented: $showNewThreadAlert) {
                TextField("Chat Title", text: $newThreadTitle)
                    .accessibilityLabel("Enter chat title")
                
                Button("Cancel", role: .cancel) {
                    newThreadTitle = ""
                }
                
                Button("Create") {
                    createNewThread()
                }
                .disabled(newThreadTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            } message: {
                Text("Enter a title for your new chat.")
            }
        }
    }
    
    // MARK: - Helper Methods
    
    /// Creates a configured ChatView for the given thread
    private func chatView(for thread: ChatThread) -> some View {
        let viewModel = ChatViewModel(apiClient: apiClient, modelContext: modelContext)
        viewModel.loadThread(thread)
        return ChatView(viewModel: viewModel)
    }
    
    /// Creates a new thread and navigates to it
    private func createNewThread() {
        let title = newThreadTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        if !title.isEmpty {
            let thread = ChatThread(title: title)
            modelContext.insert(thread)
            try? modelContext.save()
            newThreadTitle = ""
        }
    }
    
    /// Deletes threads at the specified offsets
    private func deleteThreads(at offsets: IndexSet) {
        withAnimation {
            for index in offsets {
                modelContext.delete(threads[index])
            }
            try? modelContext.save()
        }
    }
    
    /// Refreshes the thread list
    private func refreshThreads() async {
        isLoading = true
        // Simulate network refresh - in a real app, you might fetch from API
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        isLoading = false
    }
}

// MARK: - Thread Row View

struct ThreadRow: View {
    let thread: ChatThread
    @Environment(\.colorScheme) private var colorScheme
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(thread.title)
                    .font(.headline)
                    .lineLimit(1)
                
                Spacer()
                
                Text(thread.formattedTime)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Text(thread.previewText)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .lineLimit(2)
        }
        .padding(.vertical, 4)
        .contentShape(Rectangle())
    }
}

// MARK: - Preview

#Preview {
    let modelContainer = try! ModelContainer(for: ChatThread.self, ChatMessage.self)
    let modelContext = ModelContext(modelContainer)
    
    // Create sample data for preview
    let thread1 = ChatThread(title: "Project Discussion", updatedAt: Date())
    let thread2 = ChatThread(title: "API Integration Help", updatedAt: Date().addingTimeInterval(-3600))
    let thread3 = ChatThread(title: "UI Design Feedback", updatedAt: Date().addingTimeInterval(-7200))
    
    // Sample messages linked to thread1 using new relationship API
    let message1 = ChatMessage(
        content: "Can you help me with this project?",
        role: .user,
        threadId: thread1.id
    )
    let message2 = ChatMessage(
        content: "Of course! What specifically do you need help with?",
        role: .assistant,
        threadId: thread1.id
    )
    
    modelContext.insert(thread1)
    modelContext.insert(thread2)
    modelContext.insert(thread3)
    modelContext.insert(message1)
    modelContext.insert(message2)
    
    return ThreadListView(apiClient: APIClient())
        .modelContainer(modelContainer)
}
