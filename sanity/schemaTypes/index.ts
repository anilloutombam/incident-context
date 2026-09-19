import {changeType} from './change'
import {deploymentType} from './deployment'
import {incidentType} from './incident'
import {runbookType} from './runbook'
import {serviceType} from './service'

export const schemaTypes = [serviceType, deploymentType, changeType, runbookType, incidentType]
