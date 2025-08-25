//
//  IfiApp.swift
//  Ifi
//
//  Created by Samuel Anozie on 8/25/25.
//

import SwiftUI
import SwiftData

@main
struct IfiApp: App {
    // MARK: - Dependencies

    /// Shared ModelContainer holding the Chat models
    var sharedModelContainer: ModelContainer = {
        let schema = Schema([
            ChatMessage.self,
            ChatThread.self,
        ])
        let modelConfiguration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)

        do {
            return try ModelContainer(for: schema, configurations: [modelConfiguration])
        } catch {
            fatalError("Could not create ModelContainer: \(error)")
        }
    }()

    /// Shared API client for the lifetime of the app
    private let apiClient = APIClient(baseURLString: ProcessInfo.processInfo.environment["IFI_API_BASE_URL"] ?? "http://localhost:3000")

    var body: some Scene {
        WindowGroup {
            ThreadListView(apiClient: apiClient)
                .preferredColorScheme(.dark) // Force dark theme
        }
        .modelContainer(sharedModelContainer)
    }
}
