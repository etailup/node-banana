
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { path } = body;

        if (!path) {
            return NextResponse.json(
                { success: false, error: "Path is required" },
                { status: 400 }
            );
        }

        let command = "";
        const platform = os.platform();

        switch (platform) {
            case "darwin":
                command = `open "${path}"`;
                break;
            case "win32":
                command = `explorer "${path}"`;
                break;
            case "linux":
                command = `xdg-open "${path}"`;
                break;
            default:
                // Fallback for other Unix-like systems, might not work everywhere
                command = `xdg-open "${path}"`;
        }

        await execAsync(command);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to open directory:", error);
        return NextResponse.json(
            { success: false, error: "Failed to open directory" },
            { status: 500 }
        );
    }
}
