import { FieldMap } from '../../../utils/sql-crudl-helper';

export const contactFieldMap: FieldMap = {
  id: true,
  firstname: true,
  lastname: true,
  tags: true,
  address: {
    city: true,
    state: true,
    street: true,
    zip: true,
  },
};
