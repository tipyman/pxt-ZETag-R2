/**
 * makecode ZETag module Package Release 2.1
 * By 2025 Socionext Inc. and ZETA alliance Japan
 * Written by M.Urade　2025/12/5
 */

/**
 * ZETag block Ver2.1
 */
//% weight=100 color=#0fbc11 icon="\uf482" block="ZETag_R2"
namespace ZETag_R2a {
    let rxBuffer: Buffer = Buffer.create(0) // 変更前: buffer
    let txBuffer = pins.createBuffer(1);    // 変更前: dataBuffer

    /**
     * Binary data transmission over UART
     * @param txByte: 8bit data
     */
    function UART_BIN_TX(txByte: number): void {
        txBuffer.setUint8(0, txByte);
        serial.writeBuffer(txBuffer)
    }

    /**
     * Binary data reception over UART
     * @return 16bit data. If return value is 256, reception timeout.
     */
    function UART_BIN_RX(): number {
        rxBuffer = serial.readBuffer(1)
        if (rxBuffer.length > 0) {
            return rxBuffer[0]
        }
        return 0x100
    }

    function Send_Uart_data(dataArray: number[], length: number): void { // 変更前: data_array, num
        for (let i = 0; i < length; i++) {
            UART_BIN_TX(dataArray[i])
            basic.pause(5)
        }
    }

    function Receive_Uart_data(querySize: number): number[] {
        let queryData = [0, 0, 0, 0, 0, 0, 0, 0]
        let i = 0
        while (i < querySize) {
            let rxData = UART_BIN_RX()
            if (rxData > 255) {
                queryData[0] = 0
                break
            } else {
                queryData[i] = rxData & 0xff
                i++
            }
        }
        if (queryData[0] != 0) {
            if (queryData[0] != 255 && queryData[1] != 0) {
                queryData[0] = 1
            } else if (queryData[2] != querySize - 3) {
                queryData[0] = 2
            } else if (queryData[3] == 0xff) {
                queryData[0] = 3
            } else {
                let checkSum = 0
                for (let j = 0; j < querySize - 1; j++) {
                    checkSum += queryData[j]
                }
                if ((checkSum & 255) != queryData[querySize - 1]) {
                    queryData[0] = 4
                }
            }
        }
        return queryData
    }

    export function ZETag_command(txArray: number[], querySize: number): number[] {
        const txArraySize = txArray.length
        for (let i = 0; i < txArraySize; i++) {
            UART_BIN_TX(txArray[i])
        }
        let queryData = Receive_Uart_data(querySize)
        if ((queryData[3] != 0xf1) || (txArray[3] != 0xf0)) {
            if (queryData[3] != txArray[3]) {
                queryData[0] = 5
            }
        }
        return queryData
    }

    export function Send_data(dataArray: number[]): void {
        const num = dataArray.length
        let checkSum = 0x81 + num
        Send_Uart_data([0xff, 0x00, num + 2, 0x80], 4)
        for (let i = 0; i < num; i++) {
            UART_BIN_TX(dataArray[i])
            basic.pause(5)
            checkSum += dataArray[i]
        }
        UART_BIN_TX(checkSum % 256)
        let queryData = Receive_Uart_data(5)
    }

    export function Set_channel_spacing(chSpace: number): void {
        Send_Uart_data([0xff, 0x00, 0x03, 0xf0, chSpace, (0xf2 + chSpace) % 256], 6)
        let queryData = Receive_Uart_data(5)
    }

    export function Set_TX_Power(txPower: number): void {
        let txPowerData = txPower * 2
        Send_Uart_data([0xff, 0x00, 0x03, 0x41, txPowerData, (0x43 + txPowerData) % 256], 6)
        let queryData = Receive_Uart_data(5)
    }

    export function Set_Frequency(frequency: number, chNum: number, chStep: number): void {
        let step = chStep
        let channelCount = chNum <= 1 ? 1 : chNum
        let baseFrequency = frequency
        let checkSum = 0
        let paraArray = [
            0xff, 0x00, 0x08 + channelCount, 0x40, 0x01,
            Math.idiv(baseFrequency, 16777216),
            Math.idiv(baseFrequency, 65536) % 256,
            Math.idiv(baseFrequency, 256) % 256,
            baseFrequency % 256,
            channelCount, 0, 0, 0, 0, 0, 0, 0
        ]
        if (channelCount >= 2) {
            for (let i = 0; i < channelCount; i++) {
                paraArray[10 + i] = i * step
            }
        } else {
            paraArray[4] = 0
        }
        for (let i = 0; i < channelCount + 10; i++) {
            checkSum += paraArray[i]
        }
        checkSum %= 256
        paraArray[10 + channelCount] = checkSum
        Send_Uart_data(paraArray, 11 + channelCount)
        let queryData = Receive_Uart_data(5)
    }
}