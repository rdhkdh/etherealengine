import { DataTypes, Model, Sequelize } from 'sequelize'

import { MessageStatusInterface } from '@etherealengine/common/src/dbmodels/MessageStatus'

import { Application } from '../../../declarations'

export default (app: Application) => {
  const sequelizeClient: Sequelize = app.get('sequelizeClient')
  const messageStatus = sequelizeClient.define<Model<MessageStatusInterface>>(
    'message_status',
    {
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'unread'
      }
    },
    {
      hooks: {
        beforeCount(options: any): void {
          options.raw = true
        }
      }
    }
  )

  ;(messageStatus as any).associate = (models: any): void => {
    ;(messageStatus as any).belongsTo(models.message)
    ;(messageStatus as any).belongsTo(models.user)
  }

  return messageStatus
}
