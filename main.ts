/**
 * makecode ZETag module Package Release 2.
 * By 2025 Socionext Inc. and ZETA alliance Japan
 * Written by M.Urade　2025/11/18
 */

/**
 * ZETag block
 */

//% weight=100 color=#0fbc11 icon="\uf482" block="ZETag_R2"
namespace ZETag_R2 {
    let l = 0
    let i = 0
    let Query_data: number[] = []
    let sum = 0
    let rx_data = 0

    /**
     * Binary data transmission over UART
     * @param TX_data: 8bit data 
    */
    //% blockId=uart_tx_block="UART_BIN_TX %TX_data"
    //% weight=80 blockGap=8
    //% TX_data.min=0 TX_data.max=255 TX_data.defl=0
    export function UART_BIN_TX(TX_data: number): void {
        dataBuffer.setUint8(0, TX_data);
        // バッファをシリアルポートに書き込む s
        serial.writeBuffer(dataBuffer)
    }

    /**
     * Binary data reception over UART
     * @param value: none
     * @return value: 16bit data When Upper 8 bit is 1, could not receive 
    */
    //% blockId=uart_rx_block="UART_BIN_RX"
    //% weight=80 blockGap=8

    // 256回RX確認します。
    // データが取れれば00-FFのデータを返し、取れなければ0x100を返します。
    export function UART_BIN_RX(): number {
        l = 0
        while (l < 256) {
            ZETag_buffer = serial.readBuffer(1)
            if (buffer.length > 0) {
                return ZETag_buffer[0]
            }
            l += 1
        }
        return l
    }

    /**
     * ZETag command execution
     * @param TX_array : number[]
     * @param TX_array_size : number
     * @param Query_size: numbe
     * @return array[] 
        array[0]: 0xff	Query data is ready
              1	Timeout error
              2	Size error (Query size <> Receipt size)
              3	Checksum error
    */
    //% blockId=ZETag command execution block="ZETag command % TX_array %TX_array_size %Query_size"
    //% weight=80 blockGap=8
    //% Query_size.min=5 Query_size.max=9 Query_size.defl=5
    export function ZETag_command(TX_array: number[], TX_array_size: number, Query_size: number): array {
        Query_data = [0, 0, 0, 0, 0, 0, 0, 0, 0]
        i = 0
        for (let index = 0; index < TX_array_size; index++) {
            UART_BIN_TX(TX_array[i])
            i += 1
        }
        i = 0
        while (i < Query_size) {
            rx_data = UART_BIN_RX()
            if (rx_data > 255) {
                basic.showIcon(IconNames.Sad)
                Query_data[0] = 0
                break;
            } else {
                Query_data[i] = rx_data & 0xff
                i += 1
            }
        }
        if (Query_data[0] != 0) {
            if (Query_data[0] != 255 || Query_data[1] != 0) {
                Query_data[0] = 1
            } else {
                if (Query_data[2] != Query_size - 3) {
                    Query_data[0] = 2
                } else {
                    sum = 0
                    i = 0
                    while (i < Query_size - 1) {
                        sum = sum + Query_data[i]
                        i += 1
                    }
                    if ((sum & 255) != Query_data[i]) {
                        Query_data[0] = 3
                    }
                }
            }
        }
        return Query_data
    }

    let buffer: Buffer = Buffer.create(0)
    let dataBuffer = pins.createBuffer(1);
}
