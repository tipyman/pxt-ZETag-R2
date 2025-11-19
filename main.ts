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
    let rx_data = 0
    let Para_array: number[] = []
    let CheckSum = 0
    let o = 0
    let TX_Power_data = 0
    let ch_num = 0
    let Base_frequency = 0
    let Counter2 = 0

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

    function Send_Uart_data(data_array: number[], num: number): void {
        o = 0
        for (let n = 0; n <= num - 1; n++) {
            UART_BIN_TX(data_array[n])
            basic.pause(5)
        }
    }

    function Receive_Uart_data(Query_size: number): number[]{
        Query_data = [0, 0, 0, 0, 0, 0, 0, 0, 0]
        i = 0
        while (i < Query_size) {    // Receive data for (Query_size) times
            rx_data = UART_BIN_RX()
            if (rx_data > 255) {    // Timeout CheckSum
                Query_data[0] = 0   // return (0)
                break;
            } else {
                Query_data[i] = rx_data & 0xff  // store receipt data
                i += 1
            }
        }
        if (Query_data[0] != 0) {   // 0: Timeout
            if (Query_data[0] != 255 || Query_data[1] != 0) {
                Query_data[0] = 1   // 1: Format illegal
            } else if (Query_data[2] != Query_size - 3) {
                Query_data[0] = 2   // 2: Data size incorrect
            } else {
                CheckSum = 0
                i = 0
                while (i < Query_size - 1) {
                    CheckSum += Query_data[i]
                    i += 1
                }
                if ((CheckSum & 255) != Query_data[i]) {
                    Query_data[0] = 3   // 3: Check sum error
                }
            }
        }
        return Query_data
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
    //% blockId=ZETag_command_execution block="ZETag command %TX_array %TX_array_size %Query_size"
    //% weight=80 blockGap=8
    //% Query_size.min=5 Query_size.max=9 Query_size.defl=5
    export function ZETag_command(TX_array: number[], TX_array_size: number, Query_size: number): number[] {
        i = 0
        for (let index = 0; index < TX_array_size; index++) {
            UART_BIN_TX(TX_array[i])
            i += 1
        }
        Query_data = Receive_Uart_data(Query_size)
        return Query_data
    }

 /**
 * set channel spacing
 */
    //% blockId=Channel_Spacing block="Set Channel Space %s (KHz)"
    //% weight=80 blockGap=8
    //% CH_SPACE.min=100 CH_SPACE.max=200 CH_SPACE.defl=100
    export function Set_channel_spacing(CH_SPACE: number) {
        // FF 00 03 F0 64 56; 100KHz設定
        // FF+00+03+F0=1F2 -> 0xf2
        // Query FF 00 02 F1 F2
        Send_Uart_data([
            0xff,
            0x00,
            0x03,
            0xf0,
            CH_SPACE,
            (0xf2 + CH_SPACE) % 256
        ], 6)
        Query_data = Receive_Uart_data(5)   // wait 5byte UART RX
    }

/**
 * send zetag application data
 */
    //% blockId=Send_data block="Send ZETag data %data_array %num"
    //% weight=80 blockGap=8
    export function Send_data(data_array: number[], num: number) {
        // 0xff+2+0x80=0x181 -> 0x81
        // Query FF 00 02 80 81
        CheckSum = 0x81 + num
        Send_Uart_data([
            0xff,
            0x00,
            num + 2,
            0x80
        ], 4)
        o = 0
        for (let index = 0; index < num; index++) {
            UART_BIN_TX(data_array[o])
            basic.pause(5)
            CheckSum = CheckSum + data_array[o]
            o += 1
        }
        UART_BIN_TX(CheckSum % 256)

        Query_data = Receive_Uart_data(5)   // wait 5byte UART RX
    }

/**
 * set tx power
 */
    //% blockId=TX_Power block="TX Power %TX_Power (dB)"
    //% weight=80 blockGap=8
    //% TX_Power.min=1 TX_Power.max=10 TX_Power.defl=10
    export function Set_TX_Power(TX_Power: number) {
        TX_Power_data = TX_Power * 2
        // FF 00 03 41 10 53; 出力8dB設定
        // FF+00+03+41=0x143 -> 0x43
        // Query FF 00 02 41 42
        Send_Uart_data([
            0xff,
            0x00,
            0x03,
            0x41,
            TX_Power_data,
            (0x43 + TX_Power_data) % 256
        ], 6)
        Query_data = Receive_Uart_data(5)   // wait 5byte UART RX
    }

/**
 * set transmission frequency
 */
    //% blockId=Set_Frequency block="Set Frequency %Frequency (Hz) %CH_num (ch) %CH_step"
    //% weight=80 blockGap=8
    //% CH_num.min=1 CH_num.max=6 CH_num.defl=2
    //% CH_step.min=1 CH_step.max=2 CH_step.defl=2
    export function Set_Frequency(Frequency: number, CH_num: number, CH_step: number) {
        // Query FF 00 02 40 41
        o = CH_step
        if (CH_num <= 1) {
            ch_num = -1
        } else {
            ch_num = CH_num
        }
        Base_frequency = Frequency
        CheckSum = 0
        Para_array = [
            0xff,
            0x00,
            0x08 + ch_num,
            0x40,
            0x01,
            Math.idiv(Base_frequency, 16777216),
            Math.idiv(Base_frequency, 65536) % 256,
            Math.idiv(Base_frequency, 256) % 256,
            Base_frequency % 256,
            ch_num,
            0,
            0,
            0,
            0,
            0,
            0,
            0
        ]
        if (ch_num >= 2) {
            for (let Counter = 0; Counter <= ch_num - 1; Counter++) {
                Para_array[10 + Counter] = Counter * o
            }
        } else {
            Para_array[4] = 0
        }
        Counter2 = 0
        for (let index2 = 0; index2 < ch_num + 10; index2++) {
            CheckSum = CheckSum + Para_array[Counter2]
            Counter2 += 1
        }
        CheckSum = CheckSum % 256
        Para_array[10 + ch_num] = CheckSum
        Send_Uart_data(Para_array, 11 + ch_num)
        
        Query_data = Receive_Uart_data(5)       // wait 5byte UART RX
    }
}