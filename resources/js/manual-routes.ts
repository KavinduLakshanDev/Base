import * as autoRoutes from './routes/index';
import company from './routes/company';
import admin from './routes/admin';
import pos from './routes/pos';
import roles from './routes/roles';
import permissions from './routes/permissions';
import sales from './routes/sales';
import serviceJobs from './routes/service-jobs';
import customerReturns from './routes/customer-returns';
import delivery from './routes/delivery';

const routes = {
    ...autoRoutes,
    company,
    admin,
    pos,
    roles,
    permissions,
    sales,
    serviceJobs,
    customerReturns,
    delivery,
};

export default routes;
