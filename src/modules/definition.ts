export enum Color { BLACK = 1, WHITE };
export enum Score { BLACK_LOSE = -(10 ** 10), DRAW = 0, BLACK_WIN = 10 ** 10 };
export type Rec = Record<string, boolean>
export enum ChessType {
    /* 棋型  分值     */
    /* 零    0       */ZERO,
    /* 其他  1       */DEAD_ONE,
    /* 活一  100     */ALIVE_ONE,
    /* 死二  100     */DEAD_TWO,
    /* 活二  10000   */ALIVE_TWO,
    /* 死三  10000   */DEAD_THREE,
    /* 活三  1000000 */ALIVE_THREE,
    /* 死四  1000000 */DEAD_FOUR,
    /* 活四  10^8    */ALIVE_FOUR,
    /* 成五  10^10   */FIVE
};