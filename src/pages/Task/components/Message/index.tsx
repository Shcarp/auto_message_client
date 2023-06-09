import { List, Modal } from "antd";
import dayjs from "dayjs";
import { debounce } from "lodash";
import VirtualList from "rc-virtual-list";
import React, { useImperativeHandle } from "react";
import { useEffect, useState } from "react";
import { MessageData } from "../../type";
import { PushData, client } from "../../../../utils/client/websocket";

const info_type = {
    0: {
        name: "success",
        color: "green",
    },
    1: {
        name: "error",
        color: "red",
    },
    2: {
        name: "warn",
        color: "yellow",
    },
};

// eslint-disable-next-line react/display-name
const Message = React.forwardRef((_, ref) => {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<MessageData[]>([]);
    const [height, setHeight] = useState(0);
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const handleData = (data: PushData<string>) => {
            let num = 0;
            const message = {
                sendTime: data.sendTime,
                msg: data.data,
                status: data.status,
            }
            setData((prev) => {
                // 只保留最新的100条消息, 向指定位置插入数据
                const pos = num++ % 100;
                prev.splice(pos, 0, message);
                return prev;
            })
        };
        client.on("info", handleData);
        return () => {
            client.off("info", handleData);
        };
    }, []);

    useEffect(() => {
        const handleHeight = debounce(() => {
            const height = document.documentElement.clientHeight - 100;
            const width = document.documentElement.clientWidth - 100;
            setHeight(height);
            setWidth(width);
        }, 500);
        // 监听窗口变化
        document.addEventListener("resize", handleHeight);
        handleHeight();
        return () => {
            document.removeEventListener("resize", handleHeight);
        };
    }, []);

    useImperativeHandle(ref, () => ({
        open: () => {
            setOpen(true);
        },
        close: () => {
            setOpen(false);
        },
    }));

    return (
        <Modal
            title="消息"
            open={open}
            width={width}
            style={{ height: 400, top: 10 }}
            onCancel={() => setOpen(false)}
            footer={null}
        >
            <List dataSource={data}>
                <VirtualList data={data} height={height} itemHeight={20} itemKey={(item: MessageData) => `${item.sendTime}+${new Date()}`}>
                    {(item: MessageData) => {
                        const { name, color } = info_type[item.status];
                        return (
                            <List.Item color={color}>
                                <span style={{ color: color }}>[{name}]</span>{" "}
                                {`[${dayjs(item.sendTime * 1000).format("YYYY-MM-DD HH:mm")}] ${item.msg}`}
                            </List.Item>
                        );
                    }}
                </VirtualList>
            </List>
        </Modal>
    );
});

export default Message;
