/**
 * @file websocket client
 * @description websocket client
 * @module utils/client/websocket
 * @packageDocumentation
 * 随便写写, 有空再整理
 * @internal
 */

import EventEmitter from "events";
import { dialog, invoke } from "@tauri-apps/api";
import {
    CLIENT_IDENTIFICATION_CLOSE,
    CLIENT_IDENTIFICATION_CONNECT_ERROR,
    CLIENT_IDENTIFICATION_ERROR,
    CLIENT_IDENTIFICATION_PUSH,
    CLIENT_IDENTIFICATION_REQUEST,
    Client,
    ClientOptions,
    LocalResponse,
    MessageType,
    formatEventName,
} from "./base";
import { appWindow } from "@tauri-apps/api/window";
import { Event } from "@tauri-apps/api/event";
import { Events } from "..";
import { Task } from "../../pages/Task/type";

enum PushStatus {
    SUCCESS = 0,
    ERROR = 1,
    WARN = 2,
}

type EventPayload<T> = {
    event: string;
    payload: T;
    status: PushStatus;
};

export enum State {
    INIT,
    CONNECTING,
    CONNECTED,
    RECONNECTING,
    CLOSING,
    CLOSED,
}

type SystemEvent = {
    name: string;
    cb: (data: any) => void;
};

export type PushData<T> = {
    data: T,
    sendTime: number,
    event: string,
    status: PushStatus
}

export type TaskListValue = {
    list: Task[];
    running_count: number;
};

type WebsocketEvent = {
    ["block_num"]: (data: PushData<number>) => void;
    ["connect"]: () => void;
    ["wechat-name/add"]: (data: PushData<string[]>) => void;
    ["task-list/update"]: (body: TaskListValue) => void;
};

export class WebsocketClient extends EventEmitter implements Client {
    on: Events<WebsocketEvent>["on"] = super.on;
    emit: Events<WebsocketEvent>["emit"] = super.emit;

    options: ClientOptions =  {
        ip: "127.0.0.1",
        port: 9673,
    };

    client_id: string | undefined;
    state: State = State.INIT;

    connSystemEvent: SystemEvent[] = [
        {
            name: CLIENT_IDENTIFICATION_REQUEST,
            cb: (message) => {
                // console.log("send_success", message);
            },
        },
        {
            name: CLIENT_IDENTIFICATION_PUSH,
            cb: (message: Event<EventPayload<any>>) => {
                this.emit(message.payload?.event, message.payload);
            },
        },
        {
            name: CLIENT_IDENTIFICATION_ERROR,
            cb: async (message) => {
                await dialog.message(message);
                appWindow.close();
            }
        },
        {
            name: CLIENT_IDENTIFICATION_CONNECT_ERROR,
            cb: async () => {
                const ds = await dialog.confirm("连接已断开, 是否重连?");
                if (ds) {
                    try {
                        await this.connect();
                        this.state = State.CONNECTED;
                    } catch (error) {
                        await dialog.message("连接失败");
                        appWindow.close();
                    }
                } else {
                    appWindow.close();
                }
            },
        },
        {
            name: CLIENT_IDENTIFICATION_CLOSE,
            cb: async () => {
                console.log("close")
                this.state = State.CLOSED;
            }
        }
    ];

    unListen: Promise<() => void>[] = [];

    constructor() {
        super();
    }

    start() {
        this.unListen.concat(
            this.connSystemEvent.map((item) => {
                return appWindow.listen(formatEventName(item.name), item.cb);
            })
        );
    }

    stop() {
        this.state = State.CLOSING;
        (async () => {
            if (this.client_id) {
                await invoke("plugin:connect|disconnect", {
                    id: this.client_id,
                });
            }
            const unListen = await Promise.all(this.unListen);
            unListen.forEach((un) => {
                un();
            });
            this.state = State.CLOSED;
        })();
    }

    async connect(options?: ClientOptions) {
        if (options) {
            this.options = options;
        }
        if (this.state === State.CONNECTED) {
            return;
        }
        const res: LocalResponse<string> = await invoke("plugin:connect|connect", {
            ...this.options,
        });

        if (res.code === 0) {
            this.client_id = res.data;
            this.state = State.CONNECTED;
        }

        this.emit("connect");
    }

    async disconnect() {
        this.stop();
    }

    send<T>(url: string, data?: MessageType): Promise<T> {
        if (this.state !== State.CONNECTED) {
            return Promise.reject("Client not connected");
        }
        return new Promise<T>(async (resolve, reject) => {
            try {
                const res: LocalResponse<T> = await invoke("plugin:connect|send", {
                    id: this.client_id,
                    url: url,
                    data,
                });
                if (res.code === 0) {
                    resolve(res.data);
                }
                reject(res.data);
            } catch (error) {
                reject(error);
            }
        });
    }
}

export const client = new WebsocketClient();
