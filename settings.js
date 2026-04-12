// Apply theme + background from localStorage
document.addEventListener("DOMContentLoaded", () => {
    const theme = localStorage.getItem("theme");
    if (theme) document.documentElement.setAttribute("data-theme", theme);

    const bg = localStorage.getItem("bg");
    if (bg) document.body.style.backgroundImage = bg;

    loadHardwareStats();
});

async function loadHardwareStats() {

    // CPU
    document.getElementById("cpuCores").textContent =
        navigator.hardwareConcurrency + " cores";

    // Memory
    document.getElementById("memoryInfo").textContent =
        navigator.deviceMemory
            ? navigator.deviceMemory + " GB"
            : "Unavailable";

    // Battery
    if (navigator.getBattery) {
        const battery = await navigator.getBattery();
        document.getElementById("batteryInfo").textContent =
            Math.round(battery.level * 100) + "% " +
            (battery.charging ? "(Charging)" : "");
    } else {
        document.getElementById("batteryInfo").textContent = "Unavailable";
    }

    // GPU
    if (navigator.gpu) {
        const adapter = await navigator.gpu.requestAdapter();
        document.getElementById("gpuInfo").textContent =
            adapter ? adapter.name : "Unavailable";
    } else {
        document.getElementById("gpuInfo").textContent = "Unavailable";
    }

    // Network
    const conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection;
    if (conn) {
        document.getElementById("networkInfo").textContent =
            conn.effectiveType.toUpperCase() + " (" + conn.downlink + " Mbps)";
    } else {
        document.getElementById("networkInfo").textContent = "Unavailable";
    }

    // Storage
    if (navigator.storage && navigator.storage.estimate) {
        const { usage, quota } = await navigator.storage.estimate();
        const usedGB = (usage / 1e9).toFixed(2);
        const quotaGB = (quota / 1e9).toFixed(2);

        document.getElementById("storageInfo").textContent =
            `${usedGB} GB / ${quotaGB} GB`;
    } else {
        document.getElementById("storageInfo").textContent = "Unavailable";
    }
}
