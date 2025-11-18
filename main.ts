function ZETag_command (TX_array: number[], TX_array_size: number, Query_size: number) {
    Query_data = [
    0,
    1,
    0,
    0,
    0,
    0,
    0,
    0,
    0
    ]
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
function UART_BIN_TX (TX_data: number) {
    dataBuffer.setUint8(0, TX_data);
// バッファをシリアルポートに書き込む s
    serial.writeBuffer(dataBuffer)
}
// 256回RX確認します。
// データが取れれば00-FFのデータを返し、取れなければ0x100を返します。
function UART_BIN_RX () {
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
let ZETag_buffer: Buffer = null
let l = 0
let i = 0
let Query_data: number[] = []
let sum = 0
let rx_data = 0
let buffer: Buffer = Buffer.create(0)
let dataBuffer = pins.createBuffer(1);
serial.redirect(
SerialPin.P0,
SerialPin.P1,
BaudRate.BaudRate115200
)
basic.pause(100)
