export const UserRoles = {
    ADMIN: "admin",
    PROJECT_ADMIN: "project_admin",
    MEMBER: "member"
}

export const AvailableUserRole = Object.values(UserRoles)

export const TaskStatus = {
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done"
}

export const AvailableTaskStatues = Object.values(TaskStatus)
// "Why are you using this constants pattern?"
// "We have a fixed set of values such as user roles and task statuses, so we centralise them as constants instead of hard-coding strings throughout the application. Object.values() gives us an array of the allowed values, which is useful for validation."