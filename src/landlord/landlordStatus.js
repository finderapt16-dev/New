export const STATUS_OPTIONS = [
    { value: "available", label: "Available", className: "bg-green-100 text-green-700 border-green-200" },
    { value: "occupied", label: "Occupied", className: "bg-red-100 text-red-700 border-red-200" },
    { value: "maintenance", label: "Under Maintenance", className: "bg-slate-100 text-slate-600 border-slate-200" },
];
export const getStatusOption = (status) => STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0];
export const getRoomStatus = (room) => room.status ?? (room.isOccupied ? "occupied" : "available");
export const getApartmentStatus = (apartment) => {
    const rooms = apartment.rooms ?? [];
    if (rooms.length === 0) {
        return apartment.status ?? "available";
    }
    if (rooms.some((room) => getRoomStatus(room) === "available")) {
        return "available";
    }
    if (rooms.every((room) => getRoomStatus(room) === "occupied")) {
        return "occupied";
    }
    if (rooms.some((room) => getRoomStatus(room) === "maintenance")) {
        return "maintenance";
    }
    return apartment.status ?? "available";
};
