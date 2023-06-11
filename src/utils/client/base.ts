export type MessageType = number | string | boolean | object | null | undefined | Array<MessageType>

export interface LocalResponse<T> {
    code: number,
    data: T
}

export interface Client {
    connect: (address: string) => void
    disconnect: () => void
    send: (url: string, message: MessageType) => void
}


// const CLIENT_IDENTIFICATION: &str = "CLIENT_IDENTIFICATION";

// pub fn uniform_event_name(name: &str) -> String {
//     format!("{}::{}", CLIENT_IDENTIFICATION, name)
// }

const CLIENT_IDENTIFICATION = "CLIENT_IDENTIFICATION"
export const CLIENT_IDENTIFICATION_RESPONSE = "CLIENT_IDENTIFICATION_RESPONSE";
export const CLIENT_IDENTIFICATION_PUSH = "CLIENT_IDENTIFICATION_PUSH";
export const CLIENT_IDENTIFICATION_REQUEST = "CLIENT_IDENTIFICATION_REQUEST";
export const CLIENT_IDENTIFICATION_CLOSE = "CLIENT_IDENTIFICATION_CLOSE";
export const CLIENT_IDENTIFICATION_ERROR = "CLIENT_IDENTIFICATION_ERROR";
export const CLIENT_IDENTIFICATION_CONNECT_ERROR = "CLIENT_IDENTIFICATION_CONNECT_ERROR"

export const formatEventName = (name: string) => {
    return `${CLIENT_IDENTIFICATION}::${name}`
}


