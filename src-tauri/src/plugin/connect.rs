use anyhow::Result;
use proto::message::Body;
use serde::{ Serialize };
use std::{fmt::Debug, sync::Mutex};
use tauri::{plugin::TauriPlugin, Manager, RunEvent, Runtime, State, Window};
use serde_json::Value;
use crate::client::{ClientManage, MessageBody};

#[derive(Debug, serde::Serialize)]
struct LResponse {
    code: u32,
    data: String,
}

impl Default for LResponse {
    fn default() -> Self {
        Self {
            code: 0,
            data: "".to_string(),
        }
    }
}

impl LResponse {
    fn new(code: u32, data: String) -> Self {
        Self { code, data }
    }

    fn data<T: Serialize>(mut self, data: T) -> Self {
        self.data = serde_json::to_string(&data).unwrap();
        self
    }

    fn code(mut self, code: u32) -> Self {
        self.code = code;
        self
    }
}

#[tauri::command]
async fn connect<R: Runtime>(
    address: String,
    win: Window<R>,
    c_manage: State<'_, ClientState<R>>,
) -> Result<LResponse, LResponse> {
    println!("connect: {}", address);
    let res = c_manage
        .client_manage
        .lock()
        .unwrap()
        .add_client(win, &address);
    match res {
        Ok(id) => Ok(LResponse::default().data(id)),
        Err(err) => Err(LResponse::default().code(1).data(err.to_string())),
    }
}

#[tauri::command]
async fn disconnect<R: Runtime>(
    id: String,
    win: Window<R>,
    c_manage: State<'_, ClientState<R>>,
) -> Result<LResponse, LResponse> {
    println!("disconnect: {}", id);
    let res = c_manage
        .client_manage
        .lock()
        .unwrap()
        .remove_client(&win, id);
    match res {
        Ok(_) => Ok(LResponse::default()),
        Err(err) => Err(LResponse::default().code(1).data(err.to_string())),
    }
}

#[tauri::command]
async fn send<'a, R: Runtime>(
    id: &str,
    data: Value,
    url: String,
    win: Window<R>,
    c_manage: State<'_, ClientState<R>>,
) -> Result<LResponse, LResponse> {
    println!("send: {}", id);

    let client = c_manage.client_manage.lock().unwrap().get_client(id.to_string());

    match client {
        Some(client) => {
            println!("send client error: {:?}", client);
            let body = Body::from_serialize(data);
            println!("send client error: {:?}", body);
            let res = client.request(url, body).await;

            Ok(LResponse::default().data(res))
        }
        None => {
            println!("send client error");
            Err(LResponse::default()
                .code(1)
                .data("not found client".to_string()))
        }
    }
}

pub struct ClientState<R: Runtime> {
    client_manage: Mutex<ClientManage<R>>,
}

pub struct Builder {}

impl Default for Builder {
    fn default() -> Self {
        Self {}
    }
}

impl Builder {
    pub fn build<R: Runtime>(self) -> TauriPlugin<R> {
        tauri::plugin::Builder::new("connect")
            .invoke_handler(tauri::generate_handler![connect, disconnect, send])
            .setup(move |app_handle| {
                app_handle.manage(ClientState {
                    client_manage: Mutex::new(ClientManage::<R>::new()),
                });
                Ok(())
            })
            .on_event(|app_handle, event| {
                if let RunEvent::Exit = event {
                    let manage = app_handle.state::<ClientState<R>>();
                    let manage = manage.client_manage.lock().unwrap().close_all();
                    if let Err(err) = manage {
                        println!("Failed to close client: {}", err);
                    }
                }
            })
            .build()
    }
}
