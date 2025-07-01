import {Router} from 'express'
import statusRouter from './api/status/status.routes'

const router = Router()

router.use('/status', statusRouter)

export default router
//  app test
