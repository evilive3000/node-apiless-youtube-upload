import {exec} from 'child_process'
import * as util from 'util'

const execAsync = util.promisify(exec)

const pid2title_linux = async (PID: number): Promise<string> => {
    // grab all window ids
    const {stdout: stdout1} = await execAsync('xprop -root _NET_CLIENT_LIST | cut -d "#" -f 2')
    const WIDs = stdout1.split(',').map((s) => s.trim())

    // fetch info about each window
    const findWidCommand =
        `ids="${WIDs.join(' ')}"\n` +
        'for wid in ${ids}; do\n' +
        "xprop -id ${wid} _NET_WM_PID _NET_WM_NAME | awk -F ' = ' '{print $2}'" +
        ';done'

    const {stdout: stdout2} = await execAsync(findWidCommand)
    const blocks = stdout2.split('\n')

    while (blocks.length) {
        const [pid, name] = blocks.splice(0, 2)

        // if pid of the window equals PID return the title.
        // `name` variable contains string with quotes, there is why slice needed
        if (Number(pid) === PID) return name.trim().slice(1, -1)
    }

    // otherwise throw an error
    throw new Error(`Can not detect a window of process: ${PID}`)
}

const pid2title_win = async (PID: number): Promise<string> => {
    const cmd = `powershell.exe (Get-Process -id ${PID} -ErrorAction SilentlyContinue).MainWindowTitle`
    const {stdout} = await execAsync(cmd)

    return stdout
}

export const pid2title = async (PID: number): Promise<string> => {
    if (process.platform === 'win32') return pid2title_win(PID)
    if (process.platform === 'linux') return pid2title_linux(PID)

    return ''
}
