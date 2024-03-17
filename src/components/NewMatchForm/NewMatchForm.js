"use client";
import { useEffect, useState } from "react";
import { Button, Form, Modal, Select, InputNumber } from "antd";
import { getAllUsers } from "@/utils/api";
import Scores from "./Scores/Scores";
import { createNewMatch, createNewMatchDetails } from "@/utils/api";
import styles from "./NewmatchForm.module.css";
import { PlusCircleOutlined } from "@ant-design/icons";

const NewMatchForm = ({ currentUser, refetchMatches }) => {
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [bestOf, setBestOf] = useState(null);
  const [sets, setSets] = useState(null);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [playerTwo, setPlayerTwo] = useState(null);

  // Modal
  const showModal = () => {
    setOpen(true);
  };
  const handleCancel = () => {
    form.resetFields();
    setOpen(false);
    setBestOf(null);
    setSets(null);
    setPlayerTwo(null);
  };

  const handleSubmit = async (values) => {
    values.playerOne = currentUser.userId;
    values.playerOneUsername = currentUser.username;
    values.playerTwoUsername = player2?.username;
    const newMatch = await createNewMatch(values);
    const scoresBySet = {};
    Object.keys(values).forEach((key) => {
      // Extract set number and field type from the key
      const match = key.match(
        /(playerOne|playerTwo)(Set\d+)(Score|TieBreakerScore)/
      );
      if (match) {
        const [_, player, set, scoreType] = match;
        if (!scoresBySet[set])
          scoresBySet[set] = {
            set: parseInt(set.replace("Set", "")),
            matchId: newMatch.matchId,
          };
        scoresBySet[set][`${player.toLowerCase()}${scoreType}`] = values[key];
      }
    });

    for (let prop in scoresBySet) {
      await createNewMatchDetails(scoresBySet[prop]);
    }

    await refetchMatches();
    form.resetFields();
    setOpen(false);
    setBestOf(null);
    setSets(null);
    setPlayerTwo(null);
  };

  // Select options
  const filterOpponents = (input, option) =>
    (option?.label ?? "").toLowerCase().includes(input.toLowerCase());

  const filterWinner = (input, option) =>
    (option?.label ?? "").toLowerCase().includes(input.toLowerCase());

  const player2 = users.find((el) => playerTwo === el.userId);

  useEffect(() => {
    const getUsers = async () => {
      const users = await getAllUsers();
      users.map((el) => {
        el.value = el.userId;
        el.label = el.username;
      });
      const finalData = users.filter(
        (el) => el.username !== currentUser.username
      );
      setUsers(finalData);
    };

    getUsers();
  }, [currentUser.username]);

  return (
    <>
      <Button
        onClick={showModal}
        size="large"
        className={styles.newGame}
        icon={<PlusCircleOutlined />}
      >
        New Match
      </Button>
      <Modal
        open={open}
        confirmLoading={confirmLoading}
        footer={null}
        onCancel={handleCancel}
      >
        <Form
          onFinish={handleSubmit}
          form={form}
          initialValues={{ playerOne: currentUser.username }}
        >
          <h2>New Match</h2>

          {/* Player 1 */}
          <Form.Item label="Player 1" name="playerOne">
            <Select disabled showSearch optionFilterProp="children" />
          </Form.Item>

          {/* Player 2 */}
          <Form.Item
            label="Player 2"
            name="playerTwo"
            rules={[
              {
                required: true,
                message: "Please select your oppents username",
              },
            ]}
          >
            <Select
              showSearch
              placeholder="Select Opponent"
              optionFilterProp="children"
              filterOption={filterOpponents}
              options={users}
              onChange={(value) => setPlayerTwo(value)}
            />
          </Form.Item>

          {/* Match Type */}
          <Form.Item
            name="matchType"
            label="Match Type"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select
              onChange={(value) => {
                if (value === 1) {
                  setBestOf(parseInt(value));
                  setSets(1);
                } else {
                  setBestOf(parseInt(value));
                }
              }}
            >
              <Select.Option value="1">Best of 1</Select.Option>
              <Select.Option value="3">Best of 3</Select.Option>
              <Select.Option value="5">Best of 5</Select.Option>
            </Select>
          </Form.Item>

          {bestOf && bestOf !== 1 ? (
            <Form.Item
              name="sets"
              label="# of Sets"
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <InputNumber
                min={bestOf === 3 ? 2 : 3}
                max={bestOf === 3 ? 3 : 5}
                onChange={(value) => setSets(value)}
              />
            </Form.Item>
          ) : null}

          <Scores
            bestOf={bestOf === 1 ? 1 : sets}
            playerOne={currentUser.username}
            playerTwo={player2?.username}
          />

          {/* Winner */}
          <Form.Item
            label="Winner"
            name="winner"
            rules={[
              {
                required: true,
                message: "Please select the winner of the match",
              },
            ]}
          >
            <Select
              showSearch
              placeholder="Select Winner"
              optionFilterProp="children"
              filterOption={filterWinner}
              options={[
                ...users,
                { value: currentUser.userId, label: currentUser.username },
              ]}
            />
          </Form.Item>

          {/* Submit */}
          <Form.Item
            wrapperCol={{
              offset: 8,
              span: 16,
            }}
          >
            <Button type="primary" htmlType="submit">
              Submit
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default NewMatchForm;
