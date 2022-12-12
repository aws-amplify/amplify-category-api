export interface BaseRequest {
    table: string;
    operation: 'GET' | 'LIST' | 'CREATE' | 'UPDATE' | 'DELETE';
    operationName: string;
    args: RequestArgs;
}

export interface RequestArgs {
    input: Map<string, any>
}
