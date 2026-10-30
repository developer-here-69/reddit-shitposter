declare module 'sql.js' {
  export interface Statement {
    step(): boolean
    getAsObject(): Record<string, any>
    bind(values: any[]): boolean
    free(): void
    reset(): void
  }

  export interface Database {
    run(sql: string, params?: any[]): void
    exec(sql: string): Array<{ columns: string[]; values: any[][] }>
    prepare(sql: string): Statement
    export(): Uint8Array
    close(): void
  }

  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer) => Database
  }

  export default function initSqlJs(config?: any): Promise<SqlJsStatic>
}
