import {DBClient} from '../clients/DBClient.js';
import {BaseRequest} from '../interfaces/BaseRequest.js';

export class DataSourceContext {
    client: DBClient;
    request: BaseRequest;
    datastoreEnabled: boolean;
}
