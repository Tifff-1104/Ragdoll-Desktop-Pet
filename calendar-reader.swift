import Foundation
import EventKit

func output(_ value: [String: Any]) {
    let data = try! JSONSerialization.data(withJSONObject: value, options: [.sortedKeys])
    print(String(data: data, encoding: .utf8)!)
}

let store = EKEventStore()
let source = CommandLine.arguments.dropFirst().first ?? "reminders"
let days = Int(CommandLine.arguments.dropFirst(2).first ?? "10") ?? 0
guard (1...30).contains(days), ["reminders", "calendar"].contains(source) else {
    output(["error": "查询来源无效，或天数不在 1–30 之间。"])
    exit(0)
}

if source == "calendar" {
    store.requestFullAccessToEvents { granted, error in
        guard granted else {
            output(["error": "请在系统设置 → 隐私与安全性 → 日历，允许桌宠读取日历。"])
            exit(0)
        }
        let now = Date()
        let end = now.addingTimeInterval(Double(days) * 86400)
        let names = ["工作", "个人"]
        let calendars = store.calendars(for: .event).filter { names.contains($0.title) }
        let missing = names.filter { name in !calendars.contains { $0.title == name } }
        guard missing.isEmpty else {
            output(["error": "找不到日历：" + missing.joined(separator: "、") + "。请核对日历 App 左侧名称。"])
            exit(0)
        }
        let predicate = store.predicateForEvents(withStart: now, end: end, calendars: calendars)
        let formatter = ISO8601DateFormatter()
        let items: [[String: Any]] = store.events(matching: predicate).map { event in
            ["title": event.title ?? "未命名安排",
             "startsAt": formatter.string(from: event.startDate),
             "endsAt": formatter.string(from: event.endDate),
             "allDay": event.isAllDay,
             "calendar": event.calendar.title]
        }
        output(["items": items])
        exit(0)
    }
} else {
    store.requestFullAccessToReminders { granted, error in
        guard granted else {
            output(["error": "请在系统设置 → 隐私与安全性 → 提醒事项，允许桌宠读取提醒事项。"])
            exit(0)
        }
        let predicate = store.predicateForReminders(in: nil)
        store.fetchReminders(matching: predicate) { reminders in
            guard let reminders = reminders else {
                output(["error": "暂时读不到提醒事项，请稍后重试。"])
                exit(0)
            }
            func dueDate(_ reminder: EKReminder) -> Date? {
                guard let components = reminder.dueDateComponents else { return nil }
                var calendar = components.calendar ?? Calendar.current
                calendar.timeZone = components.timeZone ?? TimeZone.current
                return calendar.date(from: components)
            }
            let sorted = reminders.filter { !$0.isCompleted }.sorted {
                let left = dueDate($0) ?? Date.distantFuture
                let right = dueDate($1) ?? Date.distantFuture
                if left != right { return left < right }
                return ($0.title ?? "") < ($1.title ?? "")
            }
            let formatter = ISO8601DateFormatter()
            let items: [[String: Any]] = sorted.map { reminder in
                var item: [String: Any] = [
                    "title": reminder.title ?? "未命名提醒",
                    "allDay": reminder.dueDateComponents?.hour == nil,
                    "calendar": reminder.calendar.title
                ]
                if let date = dueDate(reminder) {
                    item["startsAt"] = formatter.string(from: date)
                }
                return item
            }
            output(["items": items])
            exit(0)
        }
    }
}
dispatchMain()
