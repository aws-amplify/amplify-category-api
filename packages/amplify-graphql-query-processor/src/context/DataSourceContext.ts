import { DBClient } from '../clients/DBClient';
import { BaseRequest } from '../interfaces/BaseRequest';

export class DataSourceContext {
    client: DBClient;
    request: BaseRequest;
    datastoreEnabled: boolean;
}
