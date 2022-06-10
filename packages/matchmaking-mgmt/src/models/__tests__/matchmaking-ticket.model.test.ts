import {DocumentClient} from 'aws-sdk/clients/dynamodb';
import {NotFoundError} from '../errors';
import {MatchmakingStatus, MatchmakingTicket, MatchmakingTicketModel} from '../matchmaking-ticket.model';

describe('MatchmakingTicketModel', () => {
  it('should create a new model instance', () => {
    const matchmakingTicketModel = new MatchmakingTicketModel('MatchmakingTicket');
    expect(matchmakingTicketModel).toHaveProperty('client');
    expect(matchmakingTicketModel).toHaveProperty('table');
  });

  describe('methods', () => {
    const mockClient = {
      get: jest.fn(),
      scan: jest.fn(),
      put: jest.fn(),
    };

    let matchmakingTicketModel: MatchmakingTicketModel;

    beforeEach(() => {
      jest.clearAllMocks();
      matchmakingTicketModel = new MatchmakingTicketModel('MatchmakingTicket', mockClient as unknown as DocumentClient);
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2022-05-04T00:00:00.000Z');
    });

    it('should get an existing Matchmaking Ticket', () => {
      mockClient.get.mockReturnValue({
        promise: () => Promise.resolve({ Item: matchmakingTicketData }),
      });

      return matchmakingTicketModel.getById('00000000-0000-0000-0000-000000000000')
        .then((resp) => {
          expect(mockClient.get).toBeCalled();
          expect(resp).toEqual(matchmakingTicketData);
        });
    });

    it('should throw when getting a non-existing Matchmaking Ticket', () => {
      mockClient.get.mockReturnValue({
        promise: () => Promise.resolve({ Item: undefined }),
      });

      return expect(matchmakingTicketModel.getById('not-found'))
        .rejects.toThrow(NotFoundError);
    });

    it('should get all existing Matchmaking Tickets', () => {
      mockClient.scan.mockReturnValue({
        promise: () => Promise.resolve({ Items: [ matchmakingTicketData ]}),
      });

      return matchmakingTicketModel.getAll()
        .then(resp => {
          expect(mockClient.scan).toBeCalled();
          expect(resp).toEqual([ matchmakingTicketData ]);
        });
    });

    it('should get an empty Matchmaking Ticket list', () => {
      mockClient.scan.mockReturnValue({
        promise: () => Promise.resolve({ Items: undefined }),
      });

      return matchmakingTicketModel.getAll()
        .then(resp => {
          expect(mockClient.scan).toBeCalled();
          expect(resp).toEqual([]);
        });
    });

    it('should create an Matchmaking Ticket', () => {
      mockClient.put.mockReturnValue({ promise: () => Promise.resolve() });
      const expectedResult = {
        ...matchmakingTicketData,
        ticketId: '00000000-0000-0000-0000-000000000000',
      };

      return matchmakingTicketModel.create(matchmakingTicketData, 0)
        .then((result) => {
          expect(result).toEqual(expectedResult);
          expect(mockClient.put).toBeCalled();
        });
    });

    it('create should retry on id collision', () => {
      mockClient.put
        .mockReturnValueOnce({ promise: () => Promise.reject({ code: 'ConditionalCheckFailedException' }) })
        .mockReturnValueOnce({ promise: () => Promise.resolve({}) });

      const expectedResult = {
        ...matchmakingTicketData,
        ticketId: '00000000-0000-0000-0000-000000000000',
      };

      return matchmakingTicketModel.create(matchmakingTicketData, 1)
        .then((result) => {
          expect(result).toEqual(expectedResult);
          expect(mockClient.put).toBeCalledTimes(2);
        });
    });

    it('should update an Matchmaking Ticket', () => {
      mockClient.put.mockReturnValue({ promise: () => Promise.resolve() });
      mockClient.get.mockReturnValue({ promise: () => Promise.resolve({ Item: matchmakingTicketData }) });

      return matchmakingTicketModel.update(matchmakingTicketData)
        .then((result) => {
          expect(result).toEqual(matchmakingTicketData);
          expect(mockClient.put).toBeCalled();
        });
    });

    it('should update an matchmakingTicket with an existing matchmakingTicket', () => {
      mockClient.put.mockReturnValue({ promise: () => Promise.resolve() });
      mockClient.get.mockReturnValue({ promise: () => Promise.resolve({ Item: matchmakingTicketData }) });

      return matchmakingTicketModel.update(matchmakingTicketData, { ...matchmakingTicketData, ip: '0.0.0.0' })
        .then((result) => {
          expect(result).toEqual(matchmakingTicketData);
          expect(mockClient.put).toBeCalled();
          expect(mockClient.get).not.toBeCalled();
        });
    });

    it("update should throw if the matchmakingTicket doesn't already exist", () => {
      mockClient.put.mockReturnValue({ promise: () => Promise.reject({ code: 'ConditionalCheckFailedException' }) });

      return expect(matchmakingTicketModel.update(matchmakingTicketData))
        .rejects.toThrowError(NotFoundError);
    });
  });
});

const matchmakingTicketData: MatchmakingTicket = {
  ticketId: '00000000-0000-0000-0000-000000000000',
  playerSessionId: '00000000-0000-0000-0000-000000000000',
  matchmakingStatus: MatchmakingStatus.MatchmakingSearching,
  ip: '0.0.0.0',
  port: '3456',
  dnsName: 'samplename',
  ttl: 0
};
