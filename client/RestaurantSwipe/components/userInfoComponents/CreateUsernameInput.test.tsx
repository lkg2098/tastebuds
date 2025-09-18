import {
  fireEvent,
  render,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { screen, renderRouter } from "expo-router/testing-library";

import { View } from "react-native";
import axios, { AxiosResponse } from "axios";
import axiosAuth from "@/api/auth";
import { CreateUsernameInput } from "./CreateUsernameInput";

jest.mock("axios", () => {
  return {
    create: () => {
      return {
        interceptors: {
          request: { eject: jest.fn(), use: jest.fn() },
          response: { eject: jest.fn(), use: jest.fn() },
        },
      };
    },
  };
});

const mockedAxios = axiosAuth as jest.Mocked<typeof axios>;

const setUpTest = (args?: { previousUsername?: string }) => {
  const index = jest.fn(() => <View />);
  let valid = false;
  let username = args?.previousUsername || "";
  const screen = render(
    <CreateUsernameInput
      value={username}
      setValid={(val: boolean) => {
        valid = val;
      }}
      setUsername={(val: string) => {
        username = val;
      }}
    />
  );
  const elements = {
    getInput: () => screen.getByTestId("create-username-input"),
    getUniquIcon: () => screen.getByTestId("unique-icon"),
    getValid: () => valid,
  };
  return { screen, elements, valid, username };
};

describe("ChangeDisplayName", () => {
  it("renders the screen", () => {
    const { elements } = setUpTest();
    expect(elements.getInput()).toBeVisible();
  });
  describe("when typing in the input field", () => {
    it("calls verify username", async () => {
      const { elements, valid } = setUpTest();
      mockedAxios.post = jest.fn().mockResolvedValue({
        status: 200,
      });
      fireEvent.changeText(elements.getInput(), "newUser");
      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalled();
        expect(mockedAxios.post).toHaveBeenLastCalledWith("/users/verifyUser", {
          username: "newUser",
          phoneNumber: "",
        });
        expect(elements.getValid()).toBe(true);
      });
    });
  });
});
