export function getTenantGreetingPeriod(date = new Date()) {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12)
        return "morning";
    if (hour >= 12 && hour < 18)
        return "afternoon";
    return "evening";
}
export function getTenantFirstName(name) {
    const firstName = name?.trim().split(/\s+/)[0] ?? "";
    return firstName && !firstName.includes("@") ? firstName : "";
}
export function getTimeBasedGreeting(name, date = new Date()) {
    const firstName = getTenantFirstName(name);
    return `Good ${getTenantGreetingPeriod(date)}${firstName ? `, ${firstName}` : ""}!`;
}
