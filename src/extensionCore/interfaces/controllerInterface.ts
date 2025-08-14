export interface ResetControllerInterface {
    reset: (controller: any) => Promise<void>;
}

export interface GetUSB_C_IP_Interface {
    getUSB_C_IP: () => string;
}
