/**
 * makecode ZETag module Package Release 2.
 * By 2025 Socionext Inc. and ZETA alliance Japan
 * Written by M.Urade　2025/11/18
 */

/**
 * ZETag block Ver2
 */

//% weight=100 color=#0fbc11 icon="\uf482" block="ZETag_R2"
namespace ZETag_R2 {
    let buffer: Buffer = Buffer.create(0)
    let dataBuffer = pins.createBuffer(1);
    let l = 0
    let i = 0
    let Query_data: number[] = []
    let sum = 0
    let rx_data = 0

    /**
     * Binary data transmission over UART
     * @param TX_data: 8bit data 
    */
    function UART_BIN_TX(TX_data: number): void {
        dataBuffer.setUint8(0, TX_data);
        // Write buffer to serial port
        serial.writeBuffer(dataBuffer)
    }

    /**
     * Binary data reception over UART
     * @param value: none
     * @return value: 16bit data If return value is 256, reception time out. 
    */
    // Check RX up to 256 times
    // If data reception is OK, return reciept data, if not, retunr 0x100
    
    function UART_BIN_RX(): number {
        l = 0
        while (l < 256) {
            buffer = serial.readBuffer(1)
            if (buffer.length > 0) {
                return buffer[0]
            }
            l += 1
        }
        return l
    }

    /**
     * ZETag command execution
     * @param TX_array : number[]
     * @param TX_array_size : number
     * @param Query_size: number
     * @return array[] 
        array[0]: 0xff	Query data is ready
              1	Timeout error
              2	Size error (Query size <> Receipt size)
              3	Checksum error
    */
    //% blockId=ZETag_command_execution block="ZETag command % TX_array %TX_array_size %Query_size"
    //% weight=80 blockGap=8
    //% Query_size.min=5 Query_size.max=9 Query_size.defl=5
    export function ZETag_command(TX_array: number[], TX_array_size: number, Query_size: number): number[] {
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
            } else if (Query_data[2] != Query_size - 3) {
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
        return Query_data
    }
}