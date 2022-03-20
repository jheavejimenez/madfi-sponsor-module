const { gql } = require('graphql-request');

const QUERY_STREAMS = gql`
  query($sender: String!, $receiver: String!) {
    streams(where: { sender: $sender, receiver: $receiver }) {
      createdAtTimestamp
      updatedAtTimestamp
      currentFlowRate
      streamedUntilUpdatedAt
    }
  }
`;

module.exports = {
  QUERY_STREAMS,
};
