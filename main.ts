/**
 * makecode ZETag module Package Ver 2.1
 * By 2023 Socionext Inc. and ZETA alliance Japan
 * Written by M.Urade　2025/12/6 (Modified)
 */

/**
 * ZETag block Ver2.1
 */
//% weight=100 color=#32CD32 icon="\uf482" block="ZETag R2.1"
namespace ZETag_R2a {
    const txBuffer = pins.createBuffer(1);

    /**
     * Binary data transmission over UART
     * @param TX_data: 8bit data
    */
    function UART_BIN_TX(txData: number): void {
        txBuffer.setUint8(0, txData);
        serial.writeBuffer(txBuffer)
    }

    /**
     * Binary data reception over UART
     * @param value: none
     * @return value: 16bit data If return value is 256, reception time out.
    */
    function UART_BIN_RX(): number {
        const rxBuffer = serial.readBuffer(1)
        if (rxBuffer.length > 0) {
            return rxBuffer[0]
        }
        return 0x100
    }

    function Send_Uart_data(dataArray: number[], length: number): void {
        for (let i = 0; i < length; i++) {
            UART_BIN_TX(dataArray[i])
            basic.pause(5)
        }
    }

    function receive_query(): number[]  {
        const response = [0, 0, 0, 0, 0, 0, 0, 0]
        let timeoutCounter = 0

        while (true) {
            const data = UART_BIN_RX();
            if (data === 0xff) break;
            timeoutCounter++;
            if (timeoutCounter > 15) return response; // Timeout
        }

        if (UART_BIN_RX() == 0) {
            response[0] = 0xff;
            response[1] = 0x0;
            const length = UART_BIN_RX();
            response[2] = length;

            for (let i = 0; i < length; i++) {
                response[3 + i] = UART_BIN_RX();
            }
        }

        if (response[0] != 255 && response[1] != 0) {
            response[0] = 1
        } else if (response[3] == 0xff) {
            response[0] = 2
        } else {
            let checkSum = 0
            let k = 0
            for (k = 0; k < response[2] + 3; k++) {
                checkSum += response[k]
            }
            if ((checkSum & 255) != response[k]) {
                response[0] = 3
            }
        }
        return response
    }

    /**
     * Send ZETag command execution
     * @param txArray : number[]
     * @param querySize: number
     * @return queryData[]
        queryData[0]:
                0xff	Query data is ready,
                   1    Time out error,
                   2	Size error (Query size <> Receipt size),
                   3    ZeTag error,
                   4    Checksum error,
                   5    Query data error
       */
    //% blockId=Send_ZETag_command block="Send ZETag command %txArray %querySize"
    //% weight=80 blockGap=8
    //% querySize.min=5 querySize.max=9 querySize.defl=5 
    export function Send_ZETag_command(txArray: number[]): number[] {
        const txArraySize = txArray.length
        for (let l = 0; l < txArraySize; l++) {
            UART_BIN_TX(txArray[l])
        }
        let queryData = receive_query()
        if ((queryData[3] == 0xf1) && (txArray[3] == 0xf0)) {
            return queryData
        } else if (queryData[3] != txArray[3]) {
            queryData[0] = 4
        }
        if (queryData[3] != txArray[3]) {
            if ((queryData[3] != 0xf1) || (txArray[3] != 0xf0)){
                queryData[0] = 4
            }
        }
        return queryData
    }

    /**
     * send zetag application data
     */
    //% blockId=Transmit_ZETag_data block="Transmit ZETag data %dataArray"
    //% weight=80 blockGap=8
    export function Transmit_ZETag_data(txArray: number[]): void {
        // 0xff+2+0x80=0x181 -> 0x81
        // Query FF 00 02 80 81
        let num = txArray.length
        if (num < 1)    return;
        if (num > 30)   num = 30;
        // 0xff+2+0x80=0x181 -> 0x81  FF 00 02 80 xx xx xx
        let checkSum = 0x81 + num
        for (let m = 0; m < num; m++){
            checkSum += txArray[m]
        }
        checkSum %= 256;
        const header = [0xff, 0x00, num + 2, 0x80];
        const response = Send_ZETag_command(header.concat(txArray).concat([checkSum]));
    }

    /**
     * set channel spacing
     */
    //% blockId=set_channel_spacing block="Set channel spacing %chSpace (KHz)"
    //% weight=80 blockGap=8
    //% chSpace.min=100 chSpace.max=200 chSpace.defl=100
    export function Set_channel_spacing(chSpace: number): void {
        // FF 00 03 F0 64 56; 100KHz設定
        // FF+00+03+F0=1F2 -> 0xf2
        // Query FF 00 02 F1 F2
        if (chSpace <= 100) {
            chSpace = 100
        } else if (chSpace >= 200) {
            chSpace = 200
        }
        const response = Send_ZETag_command([0xff, 0x00, 0x03, 0xf0, chSpace, (0xf2 + chSpace) % 256]);
    }

    /**
     * set tx power
     */
    //% blockId=Set TX_Power block="Set TX Power %txPower (dB)"
    //% weight=80 blockGap=8
    //% txPower.min=1 txPower.max=10 txPower.defl=10
    export function Set_TX_Power(txPower: number): void {
        if (txPower == 0) txPower = 1;
        else if (txPower >= 10) txPower = 10;

        let txPowerData = txPower * 2
        // FF 00 03 41 10 53; 出力8dB設定
        // FF+00+03+41=0x143 -> 0x43
        // Query FF 00 02 41 42
        const response = Send_ZETag_command([0xff, 0x00, 0x03, 0x41,txPowerData, (0x43 + txPowerData) % 256])
    }

    /**
     * set transmission frequency
     */
    //% blockId=Set_Frequency block="Set Frequency %frequency (Hz) %chNum (ch) %chStep"
    //% weight=80 blockGap=8
    //% Frequency.min=470000000 Frequency.max=928000000 Frequency.defl=922080000
    //% chNum.min=1 chNum.max=6 chNum.defl=2
    //% chStep.min=1 chStep.max=2 chStep.defl=2
    export function Set_Frequency(frequency: number, chNum: number, chStep: number): void {
        // Query FF 00 02 40 41
        let step = chStep
        let channelCount = chNum <= 1 ? -1 : chNum
        channelCount = channelCount > 6 ? 6 : channelCount

        if (step == 0) step = 1;
        else if (step >= 2) step = 2;

        let baseFrequency = frequency
        if (baseFrequency < 470000000) baseFrequency = 470000000;
        else if (baseFrequency > 928000000) baseFrequency = 928000000;
        else if ((baseFrequency > 510000000) && (baseFrequency < 920600000)) baseFrequency = 510000000;

        let checkSum = 0
        let txArray = [
            0xff, 0x00, 0x08 + channelCount, 0x40, 0x01,
            (baseFrequency >> 24) & 0xff,
            (baseFrequency >> 16) & 0xff,
            (baseFrequency >> 8) & 0xff,
            baseFrequency & 0xff,
            channelCount, 0, 0, 0, 0, 0, 0, 0
        ]
        if (channelCount >= 2) {
            for (let n = 0; n < channelCount; n++) {
                txArray[10 + n] = n * step
            }
        } else {
            txArray[4] = 0
        }
        for (let o = 0; o < channelCount + 10; o++) {
            checkSum += txArray[o]
        }
        checkSum %= 256
        txArray[10 + channelCount] = checkSum
        Send_Uart_data(txArray, 11 + channelCount)
        let queryData6 = receive_query()

        const response = Send_ZETag_command(txArray)
    }
}
