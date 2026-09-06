import asyncio
import shutil
from collections.abc import Callable
from typing import Any


async def run_command_stream(
    cmd: list[str],
    on_stdout: Callable[[str], Any] | None = None,
    cwd: str | None = None,
    timeout: int = 300,
) -> dict[str, Any]:
    """
    Executes a command asynchronously, streaming output line-by-line via callback.
    """
    executable = shutil.which(cmd[0])
    if not executable:
        return {
            "success": False,
            "error": f"Утилита '{cmd[0]}' не найдена в системе. Установите её через Homebrew или менеджер пакетов.",
            "returncode": -1,
            "output": "",
        }

    full_cmd = [executable] + cmd[1:]
    output_lines = []

    try:
        process = await asyncio.create_subprocess_exec(
            *full_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=cwd,
        )

        async def read_stream():
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                decoded = line.decode("utf-8", errors="replace").rstrip()
                output_lines.append(decoded)
                if on_stdout:
                    if asyncio.iscoroutinefunction(on_stdout):
                        await on_stdout(decoded)
                    else:
                        on_stdout(decoded)

        await asyncio.wait_for(read_stream(), timeout=timeout)
        await process.wait()

        return {
            "success": process.returncode == 0,
            "returncode": process.returncode,
            "output": "\n".join(output_lines),
        }

    except asyncio.TimeoutError:
        try:
            process.kill()
            await process.wait()
        except Exception:  # nosec B110 - best effort cleanup
            pass
        return {
            "success": False,
            "error": f"Превышено время ожидания ({timeout} сек).",
            "returncode": -2,
            "output": "\n".join(output_lines),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "returncode": -3,
            "output": "\n".join(output_lines),
        }
